import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import * as yaml from 'js-yaml';
import {
  ServerChanTurbo,
  ServerChanV3,
  Dingtalk,
  WechatRobot,
  WechatApp,
  Feishu,
  PushPlus,
  WxPusher,
  IGot,
  Qmsg,
  XiZhi,
  PushDeer,
  Discord,
  OneBot,
  Telegram,
  Ntfy,
  CustomEmail,
} from 'push-all-in-one';
import {
  NotificationConfig,
  NotificationChannel,
  SendNotificationResponse,
  ChannelInfo,
} from './interfaces/notification.interface';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private config: NotificationConfig;
  private readonly configPath: string;

  constructor() {
    this.configPath = join(process.cwd(), 'config', 'notifications.yaml');
    this.loadConfig();
  }

  private loadConfig() {
    try {
      if (existsSync(this.configPath)) {
        const content = readFileSync(this.configPath, 'utf8');
        this.config = yaml.load(content) as NotificationConfig;
      } else {
        this.config = this.getDefaultConfig();
        this.saveConfig();
      }
    } catch (error) {
      this.logger.error('Failed to load notifications config, using defaults', error);
      this.config = this.getDefaultConfig();
    }
  }

  private getDefaultConfig(): NotificationConfig {
    return {
      notifications: {
        channels: [],
      },
    };
  }

  private saveConfig() {
    try {
      const yamlContent = yaml.dump(this.config);
      writeFileSync(this.configPath, yamlContent, 'utf8');
    } catch (error) {
      this.logger.error('Failed to save notifications config', error);
    }
  }

  reloadConfig(): void {
    this.loadConfig();
    this.logger.log('Notifications config reloaded');
  }

  getChannels(): ChannelInfo[] {
    return (this.config.notifications?.channels || []).map((ch) => ({
      id: ch.id,
      type: ch.type,
      name: ch.name,
      description: ch.description,
      enabled: ch.enabled,
    }));
  }

  getEnabledChannels(): ChannelInfo[] {
    return this.getChannels().filter((ch) => ch.enabled);
  }

  private getChannelById(channelId: string): NotificationChannel | undefined {
    return (this.config.notifications?.channels || []).find((ch) => ch.id === channelId);
  }

  private createPusher(channel: NotificationChannel): any {
    const { type, config } = channel;

    switch (type) {
      case 'serverchan-turbo':
        return new ServerChanTurbo({
          SERVER_CHAN_TURBO_SENDKEY: config.SERVER_CHAN_TURBO_SENDKEY,
        });

      case 'serverchan-v3':
        return new ServerChanV3({
          SERVER_CHAN_V3_SENDKEY: config.SERVER_CHAN_V3_SENDKEY,
        });

      case 'dingtalk':
        return new Dingtalk({
          DINGTALK_ACCESS_TOKEN: config.DINGTALK_ACCESS_TOKEN,
          DINGTALK_SECRET: config.DINGTALK_SECRET,
        });

      case 'wechat-robot':
        return new WechatRobot({
          WECHAT_ROBOT_KEY: config.WECHAT_ROBOT_KEY,
        });

      case 'wechat-app':
        return new WechatApp({
          WECHAT_APP_CORPID: config.WECHAT_APP_CORPID,
          WECHAT_APP_AGENTID: config.WECHAT_APP_AGENTID,
          WECHAT_APP_SECRET: config.WECHAT_APP_SECRET,
        });

      case 'feishu':
        return new Feishu({
          FEISHU_APP_ID: config.FEISHU_APP_ID,
          FEISHU_APP_SECRET: config.FEISHU_APP_SECRET,
        });

      case 'pushplus':
        return new PushPlus({
          PUSH_PLUS_TOKEN: config.PUSH_PLUS_TOKEN,
        });

      case 'wxpusher':
        return new WxPusher({
          WX_PUSHER_APP_TOKEN: config.WX_PUSHER_APP_TOKEN,
          WX_PUSHER_UID: config.WX_PUSHER_UID,
        });

      case 'igot':
        return new IGot({
          I_GOT_KEY: config.I_GOT_KEY,
        });

      case 'qmsg':
        return new Qmsg({
          QMSG_KEY: config.QMSG_KEY,
        });

      case 'xizhi':
        return new XiZhi({
          XI_ZHI_KEY: config.XI_ZHI_KEY,
        });

      case 'pushdeer':
        return new PushDeer({
          PUSH_DEER_PUSH_KEY: config.PUSH_DEER_PUSH_KEY,
          PUSH_DEER_ENDPOINT: config.PUSH_DEER_ENDPOINT,
        });

      case 'discord':
        const discord = new Discord({
          DISCORD_WEBHOOK: config.DISCORD_WEBHOOK,
          PROXY_URL: config.PROXY_URL,
        });
        return discord;

      case 'onebot':
        return new OneBot({
          ONE_BOT_BASE_URL: config.ONE_BOT_BASE_URL,
          ONE_BOT_ACCESS_TOKEN: config.ONE_BOT_ACCESS_TOKEN,
        });

      case 'telegram':
        return new Telegram({
          TELEGRAM_BOT_TOKEN: config.TELEGRAM_BOT_TOKEN,
          TELEGRAM_CHAT_ID: config.TELEGRAM_CHAT_ID,
          PROXY_URL: config.PROXY_URL,
        });

      case 'ntfy':
        return new Ntfy({
          NTFY_URL: config.NTFY_URL || 'https://ntfy.sh',
          NTFY_TOPIC: config.NTFY_TOPIC,
        });

      case 'email':
        return new CustomEmail({
          EMAIL_TYPE: config.EMAIL_TYPE || 'text',
          EMAIL_TO_ADDRESS: config.EMAIL_TO_ADDRESS,
          EMAIL_AUTH_USER: config.EMAIL_AUTH_USER,
          EMAIL_AUTH_PASS: config.EMAIL_AUTH_PASS,
          EMAIL_HOST: config.EMAIL_HOST,
          EMAIL_PORT: config.EMAIL_PORT || 465,
        });

      default:
        throw new BadRequestException(`Unsupported channel type: ${type}`);
    }
  }

  async send(
    channelId: string,
    title: string,
    content?: string,
    options?: Record<string, any>,
  ): Promise<SendNotificationResponse> {
    const channel = this.getChannelById(channelId);

    if (!channel) {
      throw new NotFoundException(`Notification channel "${channelId}" not found`);
    }

    if (!channel.enabled) {
      throw new BadRequestException(`Notification channel "${channelId}" is disabled`);
    }

    try {
      const pusher = this.createPusher(channel);
      const result = await pusher.send(title, content || '', options || {});

      this.logger.log(`Notification sent via ${channelId}: ${title}`);

      // Extract serializable data to avoid circular reference from HTTP response objects
      const safeResult = {
        status: result?.status,
        statusText: result?.statusText,
        data: result?.data,
      };

      return {
        success: true,
        channel: channelId,
        message: 'Notification sent successfully',
        data: safeResult,
      };
    } catch (error) {
      this.logger.error(`Failed to send notification via ${channelId}`, error);

      return {
        success: false,
        channel: channelId,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async testChannel(channelId: string, title?: string, content?: string): Promise<SendNotificationResponse> {
    const testTitle = title || `Test Notification - ${new Date().toISOString()}`;
    const testContent = content || 'This is a test notification from Obsidian AI Workspace.';

    return this.send(channelId, testTitle, testContent);
  }

  // CRUD operations for channels

  getChannelFull(channelId: string): NotificationChannel | undefined {
    return this.getChannelById(channelId);
  }

  createChannel(channel: NotificationChannel): NotificationChannel {
    if (!this.config.notifications) {
      this.config.notifications = { channels: [] };
    }
    if (!this.config.notifications.channels) {
      this.config.notifications.channels = [];
    }

    // Check for duplicate ID
    if (this.config.notifications.channels.some((ch) => ch.id === channel.id)) {
      throw new BadRequestException(`Channel with ID "${channel.id}" already exists`);
    }

    const newChannel: NotificationChannel = {
      id: channel.id,
      type: channel.type,
      name: channel.name,
      description: channel.description,
      enabled: channel.enabled ?? true,
      config: channel.config,
    };

    this.config.notifications.channels.push(newChannel);
    this.saveConfig();

    this.logger.log(`Created notification channel: ${channel.id}`);
    return newChannel;
  }

  updateChannel(channelId: string, updates: Partial<NotificationChannel>): NotificationChannel {
    const channels = this.config.notifications?.channels || [];
    const index = channels.findIndex((ch) => ch.id === channelId);

    if (index === -1) {
      throw new NotFoundException(`Notification channel "${channelId}" not found`);
    }

    const channel = channels[index];

    if (updates.name !== undefined) channel.name = updates.name;
    if (updates.description !== undefined) channel.description = updates.description;
    if (updates.enabled !== undefined) channel.enabled = updates.enabled;
    if (updates.config !== undefined) channel.config = updates.config;

    this.saveConfig();

    this.logger.log(`Updated notification channel: ${channelId}`);
    return channel;
  }

  deleteChannel(channelId: string): void {
    const channels = this.config.notifications?.channels || [];
    const index = channels.findIndex((ch) => ch.id === channelId);

    if (index === -1) {
      throw new NotFoundException(`Notification channel "${channelId}" not found`);
    }

    channels.splice(index, 1);
    this.saveConfig();

    this.logger.log(`Deleted notification channel: ${channelId}`);
  }

  toggleChannel(channelId: string): NotificationChannel {
    const channel = this.getChannelById(channelId);

    if (!channel) {
      throw new NotFoundException(`Notification channel "${channelId}" not found`);
    }

    channel.enabled = !channel.enabled;
    this.saveConfig();

    this.logger.log(`Toggled notification channel ${channelId}: ${channel.enabled ? 'enabled' : 'disabled'}`);
    return channel;
  }
}
