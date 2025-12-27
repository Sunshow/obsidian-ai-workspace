import { IsString, IsOptional, IsObject, IsBoolean } from 'class-validator';

export class SendNotificationDto {
  @IsString()
  channel: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsObject()
  options?: Record<string, any>;
}

export class TestChannelDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;
}

export class CreateChannelDto {
  @IsString()
  id: string;

  @IsString()
  type: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsObject()
  config: Record<string, any>;
}

export class UpdateChannelDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsObject()
  config?: Record<string, any>;
}
