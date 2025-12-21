export interface BuiltinVariables {
  currentDate?: boolean;
  currentTime?: boolean;
  currentDatetime?: boolean;
  randomId?: boolean;
  [key: string]: boolean | undefined;
}

export interface UserInputValidation {
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
}

export interface UserInputOption {
  label: string;
  value: string;
}

export interface UserInputField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'number' | 'checkbox';
  placeholder?: string;
  defaultValue?: any;
  required?: boolean;
  options?: UserInputOption[];
  validation?: UserInputValidation;
}

export interface SkillStep {
  id: string;
  name: string;
  executorType: string;
  executorName?: string;
  action: string;
  params: Record<string, any>;
  outputVariable?: string;
  condition?: string;
}

export interface SkillOutput {
  saveToFile?: boolean;
  filePath?: string;
  showInUI?: boolean;
}

export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  icon?: string;
  enabled: boolean;
  builtin?: boolean;
  builtinVariables: BuiltinVariables;
  userInputs: UserInputField[];
  steps: SkillStep[];
  output?: SkillOutput;
}

export interface BuiltinVariableInfo {
  name: string;
  description: string;
  example: string;
}

export interface SkillExecutionContext {
  builtinValues: Record<string, string>;
  userInputValues: Record<string, any>;
  stepOutputs: Record<string, any>;
}

export interface SkillExecutionResult {
  success: boolean;
  skillId: string;
  stepResults: Array<{
    stepId: string;
    stepName: string;
    success: boolean;
    output?: any;
    error?: string;
    duration: number;
  }>;
  finalOutput?: any;
  error?: string;
  duration: number;
}
