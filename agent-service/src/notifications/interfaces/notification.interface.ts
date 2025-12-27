/**
 * Supported notification channel types based on push-all-in-one library
 */
export type NotificationChannelType =
  | 'serverchan-turbo'
  | 'serverchan-v3'
  | 'dingtalk'
  | 'wechat-robot'
  | 'wechat-app'
  | 'feishu'
  | 'pushplus'
  | 'wxpusher'
  | 'igot'
  | 'qmsg'
  | 'xizhi'
  | 'pushdeer'
  | 'discord'
  | 'onebot'
  | 'telegram'
  | 'ntfy'
  | 'email';

/**
 * Notification channel configuration
 */
export interface NotificationChannel {
  id: string;
  type: NotificationChannelType;
  name?: string;
  description?: string;
  enabled: boolean;
  config: Record<string, any>;
}

/**
 * Notification configuration file structure
 */
export interface NotificationConfig {
  notifications: {
    defaultChannel?: string;
    channels: NotificationChannel[];
  };
}

/**
 * Send notification request
 */
export interface SendNotificationRequest {
  channel: string;
  title: string;
  content?: string;
  options?: Record<string, any>;
}

/**
 * Send notification response
 */
export interface SendNotificationResponse {
  success: boolean;
  channel: string;
  message?: string;
  error?: string;
  data?: any;
}

/**
 * Channel info for listing
 */
export interface ChannelInfo {
  id: string;
  type: NotificationChannelType;
  name?: string;
  description?: string;
  enabled: boolean;
}
