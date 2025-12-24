import { IsBoolean, IsOptional, IsString, IsNumber, Min } from 'class-validator';

export class UpdateScheduleDto {
  @IsBoolean()
  enabled: boolean;

  @IsOptional()
  @IsString()
  cron?: string;

  @IsOptional()
  @IsNumber()
  @Min(1000)
  interval?: number;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsBoolean()
  retryOnFailure?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxRetries?: number;
}

export class ScheduleHistoryQueryDto {
  @IsOptional()
  @IsString()
  skillId?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;
}
