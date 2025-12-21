import {
  BuiltinVariables,
  UserInputField,
  SkillStep,
  SkillOutput,
} from '../interfaces/skill-definition.interface';

export class CreateSkillDto {
  name: string;
  description: string;
  icon?: string;
  enabled?: boolean;
  builtinVariables?: BuiltinVariables;
  userInputs?: UserInputField[];
  steps?: SkillStep[];
  output?: SkillOutput;
}

export class UpdateSkillDto {
  name?: string;
  description?: string;
  icon?: string;
  enabled?: boolean;
  builtinVariables?: BuiltinVariables;
  userInputs?: UserInputField[];
  steps?: SkillStep[];
  output?: SkillOutput;
}
