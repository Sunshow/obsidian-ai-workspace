import { Executor } from '../../executors/interfaces/executor.interface';

export interface HealthResult {
  healthy: boolean;
  responseTime?: number;
  message?: string;
}

export interface InvokeResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ConfigSchemaField {
  type: 'string' | 'number' | 'boolean' | 'object';
  default?: any;
  optional?: boolean;
  description?: string;
}

export interface ActionParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description: string;
  default?: any;
  example?: any;
}

export interface ActionDefinition {
  name: string;
  displayName: string;
  description: string;
  params: ActionParameter[];
  returns: {
    description: string;
    example?: any;
  };
}

export interface ExecutorTypeHandler {
  readonly typeName: string;
  readonly displayName: string;
  readonly configSchema: Record<string, ConfigSchemaField>;

  checkHealth(executor: Executor): Promise<HealthResult>;

  invoke(executor: Executor, action: string, params: any): Promise<InvokeResult>;

  validateConfig(config: Record<string, any>): { valid: boolean; errors?: string[] };

  getSupportedActions(): string[];

  getActionDefinitions(): ActionDefinition[];
}
