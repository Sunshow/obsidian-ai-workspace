import { IsString, IsBoolean, IsOptional, IsObject } from 'class-validator';

export class CreateExecutorDto {
  @IsString()
  name!: string;

  @IsString()
  type!: string;

  @IsString()
  endpoint!: string;

  @IsString()
  @IsOptional()
  healthPath?: string = '/health';

  @IsBoolean()
  @IsOptional()
  enabled?: boolean = true;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  @IsOptional()
  typeConfig?: Record<string, any>;
}
