import { Router, Request, Response } from 'express';
import puppeteer from 'puppeteer';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

const router = Router();

interface FetchRequest {
  url: string;
  timeout?: number;
}

interface FetchResponse {
  success: boolean;
  url: string;
  title: string;
  textContent: string;
  html?: string;
}

async function fetchWebContent(url: string, timeout: number = 30000): Promise<{ title: string; textContent: string; html: string }> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout });
    const html = await page.content();

    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) {
      throw new Error('Failed to parse article content');
    }

    return {
      title: article.title || 'Untitled',
      textContent: article.textContent || '',
      html: article.content || ''
    };
  } finally {
    await browser.close();
  }
}

// POST /api/fetch - 抓取网页内容
router.post('/', async (req: Request, res: Response) => {
  try {
    const { url, timeout } = req.body as FetchRequest;

    if (!url) {
      res.status(400).json({
        success: false,
        error: 'URL is required'
      });
      return;
    }

    console.log(`Fetching content from: ${url}`);
    const { title, textContent, html } = await fetchWebContent(url, timeout);

    const response: FetchResponse = {
      success: true,
      url,
      title,
      textContent
    };

    // 如果请求包含 includeHtml 参数，则返回 HTML
    if (req.body.includeHtml) {
      response.html = html;
    }

    res.json(response);
  } catch (error) {
    console.error('Error fetching content:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/fetch/screenshot - 截取网页截图
router.post('/screenshot', async (req: Request, res: Response) => {
  try {
    const { url, timeout = 30000, fullPage = false } = req.body;

    if (!url) {
      res.status(400).json({
        success: false,
        error: 'URL is required'
      });
      return;
    }

    console.log(`Taking screenshot of: ${url}`);

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });
      await page.goto(url, { waitUntil: 'networkidle2', timeout });

      const screenshot = await page.screenshot({
        fullPage,
        encoding: 'base64'
      });

      res.json({
        success: true,
        url,
        screenshot: `data:image/png;base64,${screenshot}`,
        timestamp: new Date().toISOString()
      });
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error('Error taking screenshot:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
