export interface Executor {
  name: string;
  type: string;
  endpoint: string;
  healthPath: string;
  enabled: boolean;
  description?: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  lastChecked?: Date;
  responseTime?: number;
  typeConfig?: Record<string, any>;
}
