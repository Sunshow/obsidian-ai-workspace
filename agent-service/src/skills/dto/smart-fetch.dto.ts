import { IsString, IsOptional } from 'class-validator';

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
}

export class UpdateSkillConfigDto {
  @IsString()
  @IsOptional()
  defaultPrompt?: string;

  @IsOptional()
  executors?: {
    playwright?: string;
    claudecode?: string;
  };
}
