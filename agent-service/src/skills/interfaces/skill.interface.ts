export interface SkillConfig {
  smartFetch: SmartFetchConfig;
}

export interface SmartFetchConfig {
  defaultPrompt: string;
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
  error?: string;
}
