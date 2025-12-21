import { Executor } from '../../executors/interfaces/executor.interface';
import { InvokeResult, ConfigSchemaField } from '../interfaces/executor-type.interface';
import { BaseExecutorHandler } from './base.handler';

export class ClaudeCodeHandler extends BaseExecutorHandler {
  readonly typeName = 'claudecode';
  readonly displayName = 'Claude Code Executor';
  readonly configSchema: Record<string, ConfigSchemaField> = {
    model: {
      type: 'string',
      default: 'claude-sonnet-4-5-20250929',
      description: 'Model to use for chat completions',
    },
    maxTurns: {
      type: 'number',
      optional: true,
      description: 'Maximum number of conversation turns',
    },
    systemPrompt: {
      type: 'string',
      optional: true,
      description: 'System prompt to use',
    },
  };

  private readonly actionEndpoints: Record<string, string> = {
    chat: '/v1/chat/completions',
    'chat-simple': '/api/chat',
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
        messages: params.messages,
        stream: params.stream ?? false,
      };

      if (typeConfig.model || params.model) {
        body.model = params.model || typeConfig.model;
      }
      if (typeConfig.maxTurns || params.max_turns) {
        body.max_turns = params.max_turns || typeConfig.maxTurns;
      }
      if (typeConfig.systemPrompt || params.system_prompt) {
        body.system_prompt = params.system_prompt || typeConfig.systemPrompt;
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
