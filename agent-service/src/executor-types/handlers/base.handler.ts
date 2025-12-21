import { Executor } from '../../executors/interfaces/executor.interface';
import {
  ExecutorTypeHandler,
  HealthResult,
  InvokeResult,
  ConfigSchemaField,
} from '../interfaces/executor-type.interface';

export abstract class BaseExecutorHandler implements ExecutorTypeHandler {
  abstract readonly typeName: string;
  abstract readonly displayName: string;
  abstract readonly configSchema: Record<string, ConfigSchemaField>;

  async checkHealth(executor: Executor): Promise<HealthResult> {
    const startTime = Date.now();
    try {
      const url = `${executor.endpoint}${executor.healthPath}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      return {
        healthy: response.ok,
        responseTime: Date.now() - startTime,
        message: response.ok ? 'OK' : `HTTP ${response.status}`,
      };
    } catch (error) {
      return {
        healthy: false,
        responseTime: Date.now() - startTime,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  abstract invoke(
    executor: Executor,
    action: string,
    params: any,
  ): Promise<InvokeResult>;

  abstract getSupportedActions(): string[];

  validateConfig(config: Record<string, any>): {
    valid: boolean;
    errors?: string[];
  } {
    const errors: string[] = [];

    for (const [key, schema] of Object.entries(this.configSchema)) {
      const value = config[key];

      if (value === undefined) {
        if (!schema.optional && schema.default === undefined) {
          errors.push(`Missing required field: ${key}`);
        }
        continue;
      }

      const expectedType = schema.type;
      const actualType = typeof value;

      if (expectedType === 'object') {
        if (actualType !== 'object' || value === null) {
          errors.push(`Field ${key} must be an object`);
        }
      } else if (actualType !== expectedType) {
        errors.push(`Field ${key} must be of type ${expectedType}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}
