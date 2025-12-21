export interface Executor {
  name: string;
  type: string;
  endpoint: string;
  healthPath: string;
  enabled: boolean;
  description?: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  lastChecked?: string;
  responseTime?: number;
}

const API_BASE = '/api/executors';

export async function fetchExecutors(): Promise<Executor[]> {
  const res = await fetch(API_BASE);
  if (!res.ok) throw new Error('Failed to fetch executors');
  return res.json();
}

export async function fetchExecutor(name: string): Promise<Executor> {
  const res = await fetch(`${API_BASE}/${name}`);
  if (!res.ok) throw new Error('Failed to fetch executor');
  return res.json();
}

export async function createExecutor(data: Omit<Executor, 'status' | 'lastChecked' | 'responseTime'>): Promise<Executor> {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create executor');
  return res.json();
}

export async function updateExecutor(name: string, data: Partial<Executor>): Promise<Executor> {
  const res = await fetch(`${API_BASE}/${name}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update executor');
  return res.json();
}

export async function deleteExecutor(name: string): Promise<void> {
  const res = await fetch(`${API_BASE}/${name}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete executor');
}

export async function toggleExecutor(name: string): Promise<Executor> {
  const res = await fetch(`${API_BASE}/${name}/toggle`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to toggle executor');
  return res.json();
}

export async function checkHealth(name: string): Promise<Executor> {
  const res = await fetch(`${API_BASE}/${name}/check`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to check health');
  return res.json();
}

export async function checkAllHealth(): Promise<Executor[]> {
  const res = await fetch(`${API_BASE}/check-all`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to check all health');
  return res.json();
}
