import { IsObject, IsOptional } from 'class-validator';

export class ExecuteSkillDto {
  @IsObject()
  @IsOptional()
  userInputs?: Record<string, any>;
}
