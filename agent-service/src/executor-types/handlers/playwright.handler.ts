import { chromium, Browser, Page } from 'playwright-core';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { Executor } from '../../executors/interfaces/executor.interface';
import { InvokeResult, ConfigSchemaField, HealthResult, ActionDefinition } from '../interfaces/executor-type.interface';
import { BaseExecutorHandler } from './base.handler';

const DEFAULT_USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const DEFAULT_CONTENT_SELECTORS = 'article,.post,.content,main,#content,.topic-body,#main-outlet';

export class PlaywrightHandler extends BaseExecutorHandler {
  readonly typeName = 'playwright';
  readonly displayName = 'Playwright Executor';
  readonly configSchema: Record<string, ConfigSchemaField> = {
    timeout: {
      type: 'number',
      default: 30000,
      description: 'Request timeout in milliseconds',
    },
    viewport: {
      type: 'object',
      optional: true,
      description: 'Viewport configuration { width, height }',
    },
    waitUntil: {
      type: 'string',
      default: 'domcontentloaded',
      optional: true,
      description: 'Wait condition: domcontentloaded, load, networkidle',
    },
    contentSelectors: {
      type: 'string',
      default: DEFAULT_CONTENT_SELECTORS,
      optional: true,
      description: 'CSS selectors to wait for content (comma separated)',
    },
    contentWaitTimeout: {
      type: 'number',
      default: 10000,
      optional: true,
      description: 'Timeout for waiting content selectors in milliseconds',
    },
  };

  getSupportedActions(): string[] {
    return ['fetch', 'screenshot'];
  }

  getActionDefinitions(): ActionDefinition[] {
    return [
      {
        name: 'fetch',
        displayName: '抓取网页内容',
        description: '抓取网页并使用 Readability 提取正文内容，支持 JS 渲染页面和 Cloudflare 保护',
        params: [
          {
            name: 'url',
            type: 'string',
            required: true,
            description: '要抓取的网页 URL',
            example: 'https://example.com/article',
          },
          {
            name: 'includeHtml',
            type: 'boolean',
            required: false,
            description: '是否在返回结果中包含 HTML 内容',
            default: false,
          },
          {
            name: 'waitUntil',
            type: 'string',
            required: false,
            description: '等待条件: domcontentloaded, load, networkidle',
            default: 'domcontentloaded',
          },
          {
            name: 'timeout',
            type: 'number',
            required: false,
            description: '超时时间（毫秒）',
            default: 30000,
          },
          {
            name: 'useReadability',
            type: 'boolean',
            required: false,
            description: '是否使用 Readability 提取正文（适用于文章页面），默认 false 直接返回 innerText',
            default: false,
          },
        ],
        returns: {
          description: '包含标题和正文的对象',
          example: {
            success: true,
            url: 'https://example.com',
            title: '文章标题',
            textContent: '正文内容...',
          },
        },
      },
      {
        name: 'screenshot',
        displayName: '网页截图',
        description: '对网页进行截图，支持全页面截图和保存到文件',
        params: [
          {
            name: 'url',
            type: 'string',
            required: true,
            description: '要截图的网页 URL',
            example: 'https://example.com',
          },
          {
            name: 'fullPage',
            type: 'boolean',
            required: false,
            description: '是否截取整个页面',
            default: false,
          },
          {
            name: 'savePath',
            type: 'string',
            required: false,
            description: '保存截图的目录路径，不填则返回 base64',
          },
          {
            name: 'fileName',
            type: 'string',
            required: false,
            description: '截图文件名，不填则自动生成',
          },
          {
            name: 'waitUntil',
            type: 'string',
            required: false,
            description: '等待条件: domcontentloaded, load, networkidle',
            default: 'domcontentloaded',
          },
        ],
        returns: {
          description: '截图结果，包含文件路径或 base64 数据',
          example: {
            success: true,
            url: 'https://example.com',
            screenshot: 'data:image/png;base64,...',
          },
        },
      },
    ];
  }

  async checkHealth(executor: Executor): Promise<HealthResult> {
    const startTime = Date.now();
    let browser: Browser | null = null;

    try {
      browser = await chromium.connect(executor.endpoint, {
        timeout: 5000,
      });

      await browser.close();

      return {
        healthy: true,
        responseTime: Date.now() - startTime,
        message: 'WebSocket connection successful',
      };
    } catch (error) {
      return {
        healthy: false,
        responseTime: Date.now() - startTime,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async invoke(
    executor: Executor,
    action: string,
    params: any,
  ): Promise<InvokeResult> {
    if (!this.getSupportedActions().includes(action)) {
      return {
        success: false,
        error: `Unsupported action: ${action}. Supported: ${this.getSupportedActions().join(', ')}`,
      };
    }

    const typeConfig = executor.typeConfig || {};
    const timeout = params.timeout || typeConfig.timeout || 30000;

    let browser: Browser | null = null;

    try {
      browser = await chromium.connect(executor.endpoint, {
        timeout: 10000,
      });

      const context = await browser.newContext({
        userAgent: typeConfig.userAgent || DEFAULT_USER_AGENT,
      });
      const page = await context.newPage();

      // Anti-detection: hide webdriver property
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      });

      const viewport = params.viewport || typeConfig.viewport;
      if (viewport) {
        await page.setViewportSize(viewport);
      } else {
        await page.setViewportSize({ width: 1280, height: 800 });
      }

      if (action === 'fetch') {
        return await this.handleFetch(page, params, timeout, typeConfig);
      } else if (action === 'screenshot') {
        return await this.handleScreenshot(page, params, timeout, typeConfig);
      }

      return { success: false, error: 'Unknown action' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  private async handleFetch(
    page: Page,
    params: { url: string; includeHtml?: boolean; waitUntil?: string; useReadability?: boolean },
    timeout: number,
    typeConfig: Record<string, any> = {},
  ): Promise<InvokeResult> {
    const { url, includeHtml, useReadability = false } = params;
    const waitUntil = (params.waitUntil || typeConfig.waitUntil || 'domcontentloaded') as 'domcontentloaded' | 'load' | 'networkidle';
    const contentSelectors = (typeConfig.contentSelectors || DEFAULT_CONTENT_SELECTORS).split(',').map((s: string) => s.trim());
    const contentWaitTimeout = typeConfig.contentWaitTimeout || 10000;

    if (!url) {
      return { success: false, error: 'URL is required' };
    }

    await page.goto(url, { waitUntil, timeout });

    // Wait for actual content to load (handles Cloudflare and JS-rendered pages)
    try {
      await page.waitForFunction(
        (selectors: string[]) => selectors.some(s => document.querySelector(s)),
        contentSelectors,
        { timeout: contentWaitTimeout }
      );
    } catch {
      // If no content selector found, wait a bit for JS rendering
      await page.waitForTimeout(3000);
    }

    const html = await page.content();

    // 默认直接获取 innerText，只有 useReadability=true 时才使用 Readability
    if (!useReadability) {
      const title = await page.title();
      const textContent = await page.evaluate(() => document.body.innerText);
      
      const result: Record<string, any> = {
        success: true,
        url,
        title: title || 'Untitled',
        textContent: textContent || '',
      };

      if (includeHtml) {
        result.html = html;
      }

      return { success: true, data: result };
    }

    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    // If Readability fails, fall back to extracting text directly
    if (!article) {
      const title = await page.title();
      const textContent = await page.evaluate(() => document.body.innerText);
      
      const result: Record<string, any> = {
        success: true,
        url,
        title: title || 'Untitled',
        textContent: textContent || '',
      };

      if (includeHtml) {
        result.html = html;
      }

      return { success: true, data: result };
    }

    const result: Record<string, any> = {
      success: true,
      url,
      title: article.title || 'Untitled',
      textContent: article.textContent || '',
    };

    if (includeHtml) {
      result.html = article.content || '';
    }

    return { success: true, data: result };
  }

  private async handleScreenshot(
    page: Page,
    params: {
      url: string;
      fullPage?: boolean;
      waitUntil?: string;
      savePath?: string;
      fileName?: string;
    },
    timeout: number,
    typeConfig: Record<string, any> = {},
  ): Promise<InvokeResult> {
    const { url, fullPage = false, savePath, fileName } = params;
    const waitUntil = (params.waitUntil || typeConfig.waitUntil || 'domcontentloaded') as 'domcontentloaded' | 'load' | 'networkidle';

    if (!url) {
      return { success: false, error: 'URL is required' };
    }

    await page.goto(url, { waitUntil, timeout });

    const screenshot = await page.screenshot({
      fullPage,
      type: 'png',
    });

    // If savePath is provided, save to file
    if (savePath) {
      const actualFileName = fileName || `screenshot-${Date.now()}.png`;
      const fullPath = join(savePath, actualFileName);

      try {
        mkdirSync(savePath, { recursive: true });
        writeFileSync(fullPath, screenshot);

        return {
          success: true,
          data: {
            success: true,
            url,
            filePath: fullPath,
            fileName: actualFileName,
            timestamp: new Date().toISOString(),
          },
        };
      } catch (error) {
        return {
          success: false,
          error: `Failed to save screenshot: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
      }
    }

    // Default: return base64
    return {
      success: true,
      data: {
        success: true,
        url,
        screenshot: `data:image/png;base64,${screenshot.toString('base64')}`,
        timestamp: new Date().toISOString(),
      },
    };
  }
}
