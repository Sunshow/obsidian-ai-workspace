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
  labelEn?: string;
  type: 'text' | 'textarea' | 'select' | 'number' | 'checkbox';
  placeholder?: string;
  placeholderEn?: string;
  defaultValue?: any;
  required?: boolean;
  options?: UserInputOption[];
  optionsSource?: string;  // 动态选项来源，如 'notification-channels'
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
  model?: string; // 仅对 claudecode 执行器生效，覆盖默认模型
}

export interface SkillOutput {
  saveToFile?: boolean;
  filePath?: string;
  showInUI?: boolean;
}

export interface SkillSchedule {
  enabled: boolean;                      // 是否启用定时执行
  cron?: string;                         // cron 表达式 (如 "0 9 * * *" 每天9点)
  interval?: number;                     // 固定间隔（毫秒），与 cron 二选一
  timezone?: string;                     // 时区，默认系统时区
  retryOnFailure?: boolean;              // 失败时是否重试
  maxRetries?: number;                   // 最大重试次数，默认 3
}

export interface ScheduleStatus {
  skillId: string;
  skillName: string;
  enabled: boolean;
  cron?: string;
  interval?: number;
  timezone?: string;
  nextExecution?: Date;
  lastExecution?: Date;
  lastSuccess?: boolean;
}

export interface ExecutionRecord {
  id: string;
  skillId: string;
  skillName: string;
  triggeredAt: Date;
  completedAt?: Date;
  triggerType: 'scheduled' | 'manual';
  success: boolean;
  error?: string;
  duration: number;
}

export interface SkillI18n {
  name?: string;
  description?: string;
}

export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  icon?: string;
  enabled: boolean;
  builtin?: boolean;
  reserved?: boolean;
  i18n?: {
    zh?: SkillI18n;
    en?: SkillI18n;
    [key: string]: SkillI18n | undefined;
  };
  builtinVariables: BuiltinVariables;
  userInputs: UserInputField[];
  steps: SkillStep[];
  output?: SkillOutput;
  schedule?: SkillSchedule;
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

export interface SkillStepResult {
  stepId: string;
  stepName: string;
  success: boolean;
  output?: any;
  rawOutput?: string; // AI 原始文本输出，便于调试查看
  error?: string;
  duration: number;
}

export interface SkillExecutionResult {
  success: boolean;
  skillId: string;
  stepResults: SkillStepResult[];
  finalOutput?: any;
  error?: string;
  duration: number;
}

// SSE 事件类型
export interface SkillExecutionEvent {
  type: 'step-start' | 'step-complete' | 'step-error' | 'execution-complete' | 'execution-error';
  stepId?: string;
  stepName?: string;
  stepIndex?: number;
  totalSteps?: number;
  success?: boolean;
  output?: any;
  rawOutput?: string;
  error?: string;
  duration?: number;
  result?: SkillExecutionResult;
}
