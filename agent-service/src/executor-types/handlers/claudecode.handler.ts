import { Executor } from '../../executors/interfaces/executor.interface';
import { InvokeResult, ConfigSchemaField, ActionDefinition } from '../interfaces/executor-type.interface';
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

  getActionDefinitions(): ActionDefinition[] {
    return [
      {
        name: 'chat',
        displayName: 'Chat Completions (OpenAI 格式)',
        description: '使用 OpenAI 兼容格式进行对话，支持流式输出',
        params: [
          {
            name: 'messages',
            type: 'array',
            required: true,
            description: '消息数组',
            example: [{ role: 'user', content: '你好' }],
          },
          {
            name: 'stream',
            type: 'boolean',
            required: false,
            description: '是否启用流式输出',
            default: false,
          },
          {
            name: 'model',
            type: 'string',
            required: false,
            description: '模型名称，覆盖执行器默认配置',
          },
          {
            name: 'max_turns',
            type: 'number',
            required: false,
            description: '最大对话轮次',
          },
          {
            name: 'system_prompt',
            type: 'string',
            required: false,
            description: '系统提示词',
          },
        ],
        returns: {
          description: 'OpenAI 格式的聊天响应对象',
          example: {
            choices: [{ message: { role: 'assistant', content: '...' } }],
          },
        },
      },
      {
        name: 'chat-simple',
        displayName: 'Simple Chat (简化格式)',
        description: '简化的对话接口，适合简单场景',
        params: [
          {
            name: 'messages',
            type: 'array',
            required: true,
            description: '消息数组',
            example: [{ role: 'user', content: '你好' }],
          },
          {
            name: 'stream',
            type: 'boolean',
            required: false,
            description: '是否启用流式输出',
            default: false,
          },
        ],
        returns: {
          description: '简化的聊天响应',
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
