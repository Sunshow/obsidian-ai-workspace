import { IsString, IsBoolean, IsOptional, IsUrl } from 'class-validator';

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
}
