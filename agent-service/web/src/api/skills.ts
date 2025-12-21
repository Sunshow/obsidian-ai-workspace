export interface Skill {
  id: string;
  name: string;
  description: string;
  endpoint: string;
}

export interface SmartFetchConfig {
  defaultPrompt: string;
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
  error?: string;
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
}): Promise<SmartFetchResult> {
  const res = await fetch(`${API_BASE}/smart-fetch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Failed to execute smart fetch');
  return res.json();
}
