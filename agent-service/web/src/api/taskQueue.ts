export interface QueuedTask {
  id: string;
  skillId: string;
  skillName: string;
  triggerType: 'scheduled' | 'manual';
  userInputs: Record<string, any>;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  error?: string;
}

export interface TaskQueueStatus {
  currentTask: QueuedTask | null;
  queuedTasks: QueuedTask[];
  recentTasks: QueuedTask[];
}

const API_BASE = '/api/skills';

export async function fetchTaskQueueStatus(): Promise<TaskQueueStatus> {
  const res = await fetch(`${API_BASE}/task-queue/status`);
  if (!res.ok) throw new Error('Failed to fetch task queue status');
  return res.json();
}
