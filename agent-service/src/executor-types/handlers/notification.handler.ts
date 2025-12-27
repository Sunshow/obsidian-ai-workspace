import { Executor } from '../../executors/interfaces/executor.interface';
import { InvokeResult, ConfigSchemaField, ActionDefinition } from '../interfaces/executor-type.interface';
import { BaseExecutorHandler } from './base.handler';
import { NotificationsService } from '../../notifications/notifications.service';

export class NotificationHandler extends BaseExecutorHandler {
  readonly typeName = 'notification';
  readonly displayName = 'Notification Pusher';
  readonly configSchema: Record<string, ConfigSchemaField> = {};

  private notificationsService: NotificationsService | null = null;

  setNotificationsService(service: NotificationsService): void {
    this.notificationsService = service;
  }

  getSupportedActions(): string[] {
    return ['send'];
  }

  getActionDefinitions(): ActionDefinition[] {
    return [
      {
        name: 'send',
        displayName: 'Send Notification',
        description: '发送通知到指定渠道',
        params: [
          {
            name: 'channel',
            type: 'string',
            required: true,
            description: '通知渠道 ID',
            example: 'dingtalk-1',
          },
          {
            name: 'title',
            type: 'string',
            required: true,
            description: '通知标题',
            example: '任务完成通知',
          },
          {
            name: 'content',
            type: 'string',
            required: false,
            description: '通知内容',
            example: '您的任务已成功完成',
          },
          {
            name: 'options',
            type: 'object',
            required: false,
            description: '额外选项（根据渠道类型不同而不同）',
          },
        ],
        returns: {
          description: '发送结果',
          example: {
            success: true,
            channel: 'dingtalk-1',
            message: 'Notification sent successfully',
          },
        },
      },
    ];
  }

  async checkHealth(): Promise<{ healthy: boolean; responseTime: number; message: string }> {
    // Notification handler doesn't have a traditional health check
    // Just verify the service is available
    return {
      healthy: this.notificationsService !== null,
      responseTime: 0,
      message: this.notificationsService ? 'OK' : 'NotificationsService not injected',
    };
  }

  async invoke(
    executor: Executor,
    action: string,
    params: any,
  ): Promise<InvokeResult> {
    if (action !== 'send') {
      return {
        success: false,
        error: `Unsupported action: ${action}. Supported: ${this.getSupportedActions().join(', ')}`,
      };
    }

    if (!this.notificationsService) {
      return {
        success: false,
        error: 'NotificationsService not available',
      };
    }

    const { channel, title, content, options } = params;

    if (!channel) {
      return {
        success: false,
        error: 'Missing required parameter: channel',
      };
    }

    if (!title) {
      return {
        success: false,
        error: 'Missing required parameter: title',
      };
    }

    try {
      const result = await this.notificationsService.send(channel, title, content, options);
      return {
        success: result.success,
        data: result,
        error: result.error,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
