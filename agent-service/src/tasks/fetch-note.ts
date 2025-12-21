import puppeteer from 'puppeteer';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';

interface FetchNoteOptions {
  url: string;
  targetDir: string;
  filename?: string;
}

interface FetchNoteResult {
  filepath: string;
  title: string;
  url: string;
}

async function fetchWebContent(url: string): Promise<{ title: string; content: string }> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    const html = await page.content();

    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) {
      throw new Error('Failed to parse article content');
    }

    return {
      title: article.title || 'Untitled',
      content: article.textContent || ''
    };
  } finally {
    await browser.close();
  }
}

async function summarizeWithClaude(content: string, title: string, url: string): Promise<string> {
  const baseURL = process.env.ANTHROPIC_BASE_URL;
  const apiKey = process.env.ANTHROPIC_AUTH_TOKEN;

  if (!apiKey) {
    throw new Error('ANTHROPIC_AUTH_TOKEN is not set');
  }

  const client = new Anthropic({
    apiKey,
    baseURL: baseURL || undefined
  });

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `请将以下网页内容整理成一篇结构清晰的 Markdown 笔记。

要求：
1. 不要添加一级标题（# 标题），因为文件名已经是标题
2. 直接从元数据开始，使用二级标题（##）作为最高层级
3. 保留原文的核心信息和要点
4. 使用列表、引用等 Markdown 格式增强可读性
5. 在笔记开头添加元数据（来源链接、抓取时间）
6. 如果内容较长，添加摘要部分

原文标题：${title}
来源链接：${url}

原文内容：
${content.substring(0, 50000)}
`
      }
    ]
  });

  const textBlock = message.content.find(block => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  return textBlock.text;
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 100);
}

export async function fetchNote(options: FetchNoteOptions): Promise<FetchNoteResult> {
  const { url, targetDir, filename } = options;

  console.log(`Fetching content from: ${url}`);
  const { title, content } = await fetchWebContent(url);

  console.log(`Summarizing with Claude: ${title}`);
  const markdown = await summarizeWithClaude(content, title, url);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const finalFilename = filename || `${sanitizeFilename(title)}.md`;
  const filepath = path.join(targetDir, finalFilename);

  fs.writeFileSync(filepath, markdown, 'utf-8');
  console.log(`Note saved to: ${filepath}`);

  return {
    filepath,
    title,
    url
  };
}
