import { chromium, Browser, Page } from 'playwright-core';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { Executor } from '../../executors/interfaces/executor.interface';
import { InvokeResult, ConfigSchemaField, HealthResult } from '../interfaces/executor-type.interface';
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
    params: { url: string; includeHtml?: boolean; waitUntil?: string },
    timeout: number,
    typeConfig: Record<string, any> = {},
  ): Promise<InvokeResult> {
    const { url, includeHtml } = params;
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
    params: { url: string; fullPage?: boolean; waitUntil?: string },
    timeout: number,
    typeConfig: Record<string, any> = {},
  ): Promise<InvokeResult> {
    const { url, fullPage = false } = params;
    const waitUntil = (params.waitUntil || typeConfig.waitUntil || 'domcontentloaded') as 'domcontentloaded' | 'load' | 'networkidle';

    if (!url) {
      return { success: false, error: 'URL is required' };
    }

    await page.goto(url, { waitUntil, timeout });

    const screenshot = await page.screenshot({
      fullPage,
      type: 'png',
    });

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
