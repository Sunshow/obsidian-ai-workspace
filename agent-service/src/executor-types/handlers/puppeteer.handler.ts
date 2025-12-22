import { Executor } from '../../executors/interfaces/executor.interface';
import { InvokeResult, ConfigSchemaField, ActionDefinition } from '../interfaces/executor-type.interface';
import { BaseExecutorHandler } from './base.handler';

export class PuppeteerHandler extends BaseExecutorHandler {
  readonly typeName = 'puppeteer';
  readonly displayName = 'Puppeteer Executor';
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
  };

  private readonly actionEndpoints: Record<string, string> = {
    fetch: '/api/fetch',
    screenshot: '/api/fetch/screenshot',
  };

  getSupportedActions(): string[] {
    return Object.keys(this.actionEndpoints);
  }

  getActionDefinitions(): ActionDefinition[] {
    return [
      {
        name: 'fetch',
        displayName: '抓取网页内容',
        description: '使用 Puppeteer 抓取网页并提取正文内容',
        params: [
          {
            name: 'url',
            type: 'string',
            required: true,
            description: '要抓取的网页 URL',
            example: 'https://example.com/article',
          },
          {
            name: 'timeout',
            type: 'number',
            required: false,
            description: '超时时间（毫秒）',
            default: 30000,
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
        description: '对网页进行截图，返回 base64 编码的图片',
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
        ],
        returns: {
          description: '截图结果，包含 base64 编码的图片',
          example: {
            success: true,
            screenshot: 'data:image/png;base64,...',
          },
        },
      },
    ];
  }

  async invoke(
    executor: Executor,
    action: string,
    params: any,
  ): Promise<InvokeResult> {
    const endpoint = this.actionEndpoints[action];
    if (!endpoint) {
      return {
        success: false,
        error: `Unsupported action: ${action}. Supported: ${this.getSupportedActions().join(', ')}`,
      };
    }

    try {
      const url = `${executor.endpoint}${endpoint}`;
      const typeConfig = executor.typeConfig || {};

      const body: Record<string, any> = {
        ...params,
      };

      if (typeConfig.timeout && !params.timeout) {
        body.timeout = typeConfig.timeout;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
