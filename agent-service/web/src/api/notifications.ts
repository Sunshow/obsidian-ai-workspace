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

export interface ChannelInfo {
  id: string;
  type: NotificationChannelType;
  name?: string;
  description?: string;
  enabled: boolean;
}

export interface NotificationChannel extends ChannelInfo {
  config: Record<string, any>;
}

export interface SendNotificationResponse {
  success: boolean;
  channel: string;
  message?: string;
  error?: string;
  data?: any;
}

const API_BASE = '/api/notifications';

export async function fetchChannels(): Promise<ChannelInfo[]> {
  const res = await fetch(`${API_BASE}/channels`);
  if (!res.ok) throw new Error('Failed to fetch channels');
  return res.json();
}

export async function fetchChannel(id: string): Promise<NotificationChannel> {
  const res = await fetch(`${API_BASE}/channels/${id}`);
  if (!res.ok) throw new Error('Failed to fetch channel');
  return res.json();
}

export async function createChannel(channel: {
  id: string;
  type: string;
  name?: string;
  description?: string;
  enabled?: boolean;
  config: Record<string, any>;
}): Promise<NotificationChannel> {
  const res = await fetch(`${API_BASE}/channels`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(channel),
  });
  if (!res.ok) throw new Error('Failed to create channel');
  return res.json();
}

export async function updateChannel(
  id: string,
  updates: {
    name?: string;
    description?: string;
    enabled?: boolean;
    config?: Record<string, any>;
  }
): Promise<NotificationChannel> {
  const res = await fetch(`${API_BASE}/channels/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Failed to update channel');
  return res.json();
}

export async function deleteChannel(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/channels/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete channel');
}

export async function toggleChannel(id: string): Promise<NotificationChannel> {
  const res = await fetch(`${API_BASE}/channels/${id}/toggle`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to toggle channel');
  return res.json();
}

export async function testChannel(
  id: string,
  title?: string,
  content?: string
): Promise<SendNotificationResponse> {
  const res = await fetch(`${API_BASE}/channels/${id}/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content }),
  });
  if (!res.ok) throw new Error('Failed to test channel');
  return res.json();
}

export async function sendNotification(
  channel: string,
  title: string,
  content?: string,
  options?: Record<string, any>
): Promise<SendNotificationResponse> {
  const res = await fetch(`${API_BASE}/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channel, title, content, options }),
  });
  if (!res.ok) throw new Error('Failed to send notification');
  return res.json();
}

export async function reloadConfig(): Promise<void> {
  const res = await fetch(`${API_BASE}/reload`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to reload config');
}

export async function getDefaultChannel(): Promise<string | null> {
  const res = await fetch(`${API_BASE}/default-channel`);
  if (!res.ok) throw new Error('Failed to get default channel');
  const data = await res.json();
  return data.defaultChannel;
}

export async function setDefaultChannel(id: string): Promise<string> {
  const res = await fetch(`${API_BASE}/default-channel/${id}`, { method: 'PUT' });
  if (!res.ok) throw new Error('Failed to set default channel');
  const data = await res.json();
  return data.defaultChannel;
}

// Channel type configurations for form rendering
export const CHANNEL_TYPES: {
  type: NotificationChannelType;
  label: string;
  labelZh: string;
  fields: { key: string; label: string; labelZh: string; type: 'text' | 'number' | 'password'; required: boolean }[];
}[] = [
  {
    type: 'dingtalk',
    label: 'DingTalk Robot',
    labelZh: '钉钉机器人',
    fields: [
      { key: 'DINGTALK_ACCESS_TOKEN', label: 'Access Token', labelZh: 'Access Token', type: 'password', required: true },
      { key: 'DINGTALK_SECRET', label: 'Secret', labelZh: '签名密钥', type: 'password', required: false },
    ],
  },
  {
    type: 'telegram',
    label: 'Telegram',
    labelZh: 'Telegram',
    fields: [
      { key: 'TELEGRAM_BOT_TOKEN', label: 'Bot Token', labelZh: 'Bot Token', type: 'password', required: true },
      { key: 'TELEGRAM_CHAT_ID', label: 'Chat ID', labelZh: 'Chat ID', type: 'text', required: true },
      { key: 'PROXY_URL', label: 'Proxy URL', labelZh: '代理地址', type: 'text', required: false },
    ],
  },
  {
    type: 'discord',
    label: 'Discord',
    labelZh: 'Discord',
    fields: [
      { key: 'DISCORD_WEBHOOK', label: 'Webhook URL', labelZh: 'Webhook URL', type: 'password', required: true },
      { key: 'PROXY_URL', label: 'Proxy URL', labelZh: '代理地址', type: 'text', required: false },
    ],
  },
  {
    type: 'wechat-robot',
    label: 'WeChat Work Robot',
    labelZh: '企业微信机器人',
    fields: [
      { key: 'WECHAT_ROBOT_KEY', label: 'Robot Key', labelZh: '机器人 Key', type: 'password', required: true },
    ],
  },
  {
    type: 'wechat-app',
    label: 'WeChat Work App',
    labelZh: '企业微信应用',
    fields: [
      { key: 'WECHAT_APP_CORPID', label: 'Corp ID', labelZh: '企业 ID', type: 'text', required: true },
      { key: 'WECHAT_APP_AGENTID', label: 'Agent ID', labelZh: '应用 ID', type: 'number', required: true },
      { key: 'WECHAT_APP_SECRET', label: 'Secret', labelZh: '应用密钥', type: 'password', required: true },
    ],
  },
  {
    type: 'feishu',
    label: 'Feishu',
    labelZh: '飞书',
    fields: [
      { key: 'FEISHU_APP_ID', label: 'App ID', labelZh: 'App ID', type: 'text', required: true },
      { key: 'FEISHU_APP_SECRET', label: 'App Secret', labelZh: 'App Secret', type: 'password', required: true },
    ],
  },
  {
    type: 'email',
    label: 'Email',
    labelZh: '邮件',
    fields: [
      { key: 'EMAIL_TO_ADDRESS', label: 'To Address', labelZh: '收件人地址', type: 'text', required: true },
      { key: 'EMAIL_AUTH_USER', label: 'SMTP User', labelZh: 'SMTP 用户', type: 'text', required: true },
      { key: 'EMAIL_AUTH_PASS', label: 'SMTP Password', labelZh: 'SMTP 密码', type: 'password', required: true },
      { key: 'EMAIL_HOST', label: 'SMTP Host', labelZh: 'SMTP 服务器', type: 'text', required: true },
      { key: 'EMAIL_PORT', label: 'SMTP Port', labelZh: 'SMTP 端口', type: 'number', required: false },
    ],
  },
  {
    type: 'serverchan-v3',
    label: 'Server Chan V3',
    labelZh: 'Server酱³',
    fields: [
      { key: 'SERVER_CHAN_V3_SENDKEY', label: 'Send Key', labelZh: 'Send Key', type: 'password', required: true },
    ],
  },
  {
    type: 'serverchan-turbo',
    label: 'Server Chan Turbo',
    labelZh: 'Server酱 Turbo',
    fields: [
      { key: 'SERVER_CHAN_TURBO_SENDKEY', label: 'Send Key', labelZh: 'Send Key', type: 'password', required: true },
    ],
  },
  {
    type: 'pushplus',
    label: 'PushPlus',
    labelZh: 'PushPlus',
    fields: [
      { key: 'PUSH_PLUS_TOKEN', label: 'Token', labelZh: 'Token', type: 'password', required: true },
    ],
  },
  {
    type: 'ntfy',
    label: 'ntfy',
    labelZh: 'ntfy',
    fields: [
      { key: 'NTFY_URL', label: 'Server URL', labelZh: '服务器地址', type: 'text', required: false },
      { key: 'NTFY_TOPIC', label: 'Topic', labelZh: '主题', type: 'text', required: true },
    ],
  },
  {
    type: 'pushdeer',
    label: 'PushDeer',
    labelZh: 'PushDeer',
    fields: [
      { key: 'PUSH_DEER_PUSH_KEY', label: 'Push Key', labelZh: 'Push Key', type: 'password', required: true },
      { key: 'PUSH_DEER_ENDPOINT', label: 'Endpoint', labelZh: '服务端点', type: 'text', required: false },
    ],
  },
];
