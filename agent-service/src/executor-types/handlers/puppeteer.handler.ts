import { Executor } from '../../executors/interfaces/executor.interface';
import { InvokeResult, ConfigSchemaField } from '../interfaces/executor-type.interface';
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
