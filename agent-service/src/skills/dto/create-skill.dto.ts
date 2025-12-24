import { IsString, IsBoolean, IsOptional, IsArray, IsObject } from 'class-validator';
import {
  BuiltinVariables,
  UserInputField,
  SkillStep,
  SkillOutput,
  SkillSchedule,
} from '../interfaces/skill-definition.interface';

export class CreateSkillDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsObject()
  builtinVariables?: BuiltinVariables;

  @IsOptional()
  @IsArray()
  userInputs?: UserInputField[];

  @IsOptional()
  @IsArray()
  steps?: SkillStep[];

  @IsOptional()
  @IsObject()
  output?: SkillOutput;

  @IsOptional()
  @IsObject()
  schedule?: SkillSchedule;
}

export class UpdateSkillDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsObject()
  builtinVariables?: BuiltinVariables;

  @IsOptional()
  @IsArray()
  userInputs?: UserInputField[];

  @IsOptional()
  @IsArray()
  steps?: SkillStep[];

  @IsOptional()
  @IsObject()
  output?: SkillOutput;

  @IsOptional()
  @IsObject()
  schedule?: SkillSchedule;
}
