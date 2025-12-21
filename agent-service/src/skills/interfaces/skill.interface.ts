export interface SkillConfig {
  smartFetch: SmartFetchConfig;
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
