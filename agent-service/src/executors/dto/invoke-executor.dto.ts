import { IsString, IsOptional, IsObject } from 'class-validator';

export class InvokeExecutorDto {
  @IsString()
  action!: string;

  @IsObject()
  @IsOptional()
  params?: Record<string, any>;
}
