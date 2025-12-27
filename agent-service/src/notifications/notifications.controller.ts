import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { SendNotificationDto, TestChannelDto, CreateChannelDto, UpdateChannelDto } from './dto/send-notification.dto';
import { SendNotificationResponse, ChannelInfo, NotificationChannel } from './interfaces/notification.interface';

@Controller('api/notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('channels')
  getChannels(): ChannelInfo[] {
    return this.notificationsService.getChannels();
  }

  @Get('channels/enabled')
  getEnabledChannels(): ChannelInfo[] {
    return this.notificationsService.getEnabledChannels();
  }

  @Get('channels/:id')
  getChannel(@Param('id') id: string): NotificationChannel | undefined {
    return this.notificationsService.getChannelFull(id);
  }

  @Post('channels')
  createChannel(@Body() dto: CreateChannelDto): NotificationChannel {
    return this.notificationsService.createChannel({
      id: dto.id,
      type: dto.type as any,
      name: dto.name,
      description: dto.description,
      enabled: dto.enabled ?? true,
      config: dto.config,
    });
  }

  @Put('channels/:id')
  updateChannel(@Param('id') id: string, @Body() dto: UpdateChannelDto): NotificationChannel {
    return this.notificationsService.updateChannel(id, {
      name: dto.name,
      description: dto.description,
      enabled: dto.enabled,
      config: dto.config,
    });
  }

  @Delete('channels/:id')
  deleteChannel(@Param('id') id: string): { message: string } {
    this.notificationsService.deleteChannel(id);
    return { message: `Channel "${id}" deleted` };
  }

  @Post('channels/:id/toggle')
  toggleChannel(@Param('id') id: string): NotificationChannel {
    return this.notificationsService.toggleChannel(id);
  }

  @Post('channels/:id/test')
  async testChannel(
    @Param('id') id: string,
    @Body() dto: TestChannelDto,
  ): Promise<SendNotificationResponse> {
    return this.notificationsService.testChannel(id, dto.title, dto.content);
  }

  @Post('send')
  async send(@Body() dto: SendNotificationDto): Promise<SendNotificationResponse> {
    return this.notificationsService.send(dto.channel, dto.title, dto.content, dto.options);
  }

  @Post('reload')
  reloadConfig(): { message: string } {
    this.notificationsService.reloadConfig();
    return { message: 'Notifications config reloaded' };
  }
}
