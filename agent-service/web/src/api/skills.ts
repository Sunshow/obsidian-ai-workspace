export interface Skill {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  builtin?: boolean;
  reserved?: boolean;
  enabled?: boolean;
  i18n?: {
    zh?: { name?: string; description?: string };
    en?: { name?: string; description?: string };
    [key: string]: { name?: string; description?: string } | undefined;
  };
}

export interface SmartFetchConfig {
  defaultPrompt: string;
  autoGenerateNote: boolean;
  autoCreateCategory: boolean;
  notePath: string;
  executors: {
    playwright: string;
    claudecode: string;
  };
}

export interface SkillConfig {
  smartFetch: SmartFetchConfig;
}

export interface SmartFetchResult {
  success: boolean;
  url: string;
  title?: string;
  originalContent?: string;
  generatedNote?: string;
  noteSaved?: boolean;
  noteSavePath?: string;
  error?: string;
  warning?: string;
}

// Skill Definition Types
export interface BuiltinVariables {
  currentDate?: boolean;
  currentTime?: boolean;
  currentDatetime?: boolean;
  randomId?: boolean;
  [key: string]: boolean | undefined;
}

export interface UserInputOption {
  label: string;
  value: string;
}

export interface UserInputValidation {
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
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
  model?: string; // 仅对 claudecode 执行器生效
}

export interface SkillOutput {
  saveToFile?: boolean;
  filePath?: string;
  showInUI?: boolean;
}

export interface SkillSchedule {
  enabled: boolean;
  cron?: string;
  interval?: number;
  timezone?: string;
  retryOnFailure?: boolean;
  maxRetries?: number;
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

export interface SkillStepResult {
  stepId: string;
  stepName: string;
  success: boolean;
  output?: any;
  rawOutput?: string;
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

// SSE Event Types
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

export interface SkillStreamCallbacks {
  onStepStart?: (event: SkillExecutionEvent) => void;
  onStepComplete?: (event: SkillExecutionEvent) => void;
  onStepError?: (event: SkillExecutionEvent) => void;
  onComplete?: (result: SkillExecutionResult) => void;
  onError?: (error: string) => void;
}

const API_BASE = '/api/skills';

export async function fetchSkills(): Promise<Skill[]> {
  const res = await fetch(API_BASE);
  if (!res.ok) throw new Error('Failed to fetch skills');
  return res.json();
}

export async function fetchSkillConfig(): Promise<SkillConfig> {
  const res = await fetch(`${API_BASE}/config`);
  if (!res.ok) throw new Error('Failed to fetch skill config');
  return res.json();
}

export async function fetchSmartFetchConfig(): Promise<SmartFetchConfig> {
  const res = await fetch(`${API_BASE}/config/smart-fetch`);
  if (!res.ok) throw new Error('Failed to fetch smart fetch config');
  return res.json();
}

export async function updateSmartFetchConfig(
  config: Partial<SmartFetchConfig>
): Promise<SmartFetchConfig> {
  const res = await fetch(`${API_BASE}/config/smart-fetch`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!res.ok) throw new Error('Failed to update smart fetch config');
  return res.json();
}

export async function smartFetch(params: {
  url: string;
  prompt?: string;
  playwrightExecutor?: string;
  claudecodeExecutor?: string;
  autoGenerateNote?: boolean;
  autoCreateCategory?: boolean;
  notePath?: string;
}): Promise<SmartFetchResult> {
  const res = await fetch(`${API_BASE}/smart-fetch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Failed to execute smart fetch');
  return res.json();
}

// Skill Definitions CRUD

export async function fetchBuiltinVariables(): Promise<BuiltinVariableInfo[]> {
  const res = await fetch(`${API_BASE}/builtin-variables`);
  if (!res.ok) throw new Error('Failed to fetch builtin variables');
  return res.json();
}

export async function fetchDynamicOptions(source: string): Promise<UserInputOption[]> {
  const res = await fetch(`${API_BASE}/options/${source}`);
  if (!res.ok) throw new Error('Failed to fetch dynamic options');
  return res.json();
}

export async function fetchSkillDefinitions(): Promise<SkillDefinition[]> {
  const res = await fetch(`${API_BASE}/definitions`);
  if (!res.ok) throw new Error('Failed to fetch skill definitions');
  return res.json();
}

export async function fetchSkillDefinition(id: string): Promise<SkillDefinition> {
  const res = await fetch(`${API_BASE}/definitions/${id}`);
  if (!res.ok) throw new Error('Failed to fetch skill definition');
  return res.json();
}

export async function createSkillDefinition(
  skill: Omit<SkillDefinition, 'id' | 'builtin'>
): Promise<SkillDefinition> {
  const res = await fetch(`${API_BASE}/definitions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(skill),
  });
  if (!res.ok) throw new Error('Failed to create skill');
  return res.json();
}

export async function updateSkillDefinition(
  id: string,
  skill: Partial<SkillDefinition>
): Promise<SkillDefinition> {
  const res = await fetch(`${API_BASE}/definitions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(skill),
  });
  if (!res.ok) throw new Error('Failed to update skill');
  return res.json();
}

export async function deleteSkillDefinition(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/definitions/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete skill');
}

export async function executeSkill(
  id: string,
  userInputs: Record<string, any>
): Promise<SkillExecutionResult> {
  const res = await fetch(`${API_BASE}/${id}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userInputs }),
  });
  if (!res.ok) throw new Error('Failed to execute skill');
  return res.json();
}

/**
 * Execute skill with real-time event streaming via SSE
 */
export function executeSkillStream(
  id: string,
  userInputs: Record<string, any>,
  callbacks: SkillStreamCallbacks
): { cancel: () => void } {
  // Encode userInputs as base64 for query parameter (supports Unicode)
  const userInputsBase64 = btoa(
    String.fromCharCode(...new TextEncoder().encode(JSON.stringify(userInputs)))
  );
  const url = `${API_BASE}/${id}/execute-stream?userInputs=${encodeURIComponent(userInputsBase64)}`;
  
  const eventSource = new EventSource(url);
  
  eventSource.onmessage = (event) => {
    try {
      const data: SkillExecutionEvent = JSON.parse(event.data);
      
      switch (data.type) {
        case 'step-start':
          callbacks.onStepStart?.(data);
          break;
        case 'step-complete':
          callbacks.onStepComplete?.(data);
          break;
        case 'step-error':
          callbacks.onStepError?.(data);
          break;
        case 'execution-complete':
          if (data.result) {
            callbacks.onComplete?.(data.result);
          }
          eventSource.close();
          break;
        case 'execution-error':
          if (data.result) {
            callbacks.onComplete?.(data.result);
          } else if (data.error) {
            callbacks.onError?.(data.error);
          }
          eventSource.close();
          break;
      }
    } catch (e) {
      console.error('Failed to parse SSE event:', e);
    }
  };
  
  eventSource.onerror = (error) => {
    console.error('SSE connection error:', error);
    callbacks.onError?.('Connection error');
    eventSource.close();
  };
  
  return {
    cancel: () => {
      eventSource.close();
    },
  };
}

export async function reloadSkills(): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/reload`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to reload skills');
  return res.json();
}

export async function saveSkillDefaultInputs(
  id: string,
  defaultInputs: Record<string, any>
): Promise<SkillDefinition> {
  const skill = await fetchSkillDefinition(id);
  // 直接更新 userInputs 中的 defaultValue
  const updatedUserInputs = skill.userInputs?.map(input => ({
    ...input,
    defaultValue: defaultInputs[input.name] ?? input.defaultValue
  }));
  return updateSkillDefinition(id, { userInputs: updatedUserInputs });
}
