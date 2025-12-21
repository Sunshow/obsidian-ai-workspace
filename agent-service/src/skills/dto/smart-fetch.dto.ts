import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class SmartFetchDto {
  @IsString()
  url: string;

  @IsString()
  @IsOptional()
  prompt?: string;

  @IsString()
  @IsOptional()
  playwrightExecutor?: string;

  @IsString()
  @IsOptional()
  claudecodeExecutor?: string;

  @IsBoolean()
  @IsOptional()
  autoGenerateNote?: boolean;

  @IsBoolean()
  @IsOptional()
  autoCreateCategory?: boolean;

  @IsString()
  @IsOptional()
  notePath?: string;
}

export class UpdateSkillConfigDto {
  @IsString()
  @IsOptional()
  defaultPrompt?: string;

  @IsBoolean()
  @IsOptional()
  autoGenerateNote?: boolean;

  @IsBoolean()
  @IsOptional()
  autoCreateCategory?: boolean;

  @IsString()
  @IsOptional()
  notePath?: string;

  @IsOptional()
  executors?: {
    playwright?: string;
    claudecode?: string;
  };
}
