import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import * as yaml from 'js-yaml';

export interface ExecutorConfig {
  name: string;
  type: string;
  endpoint: string;
  healthPath: string;
  enabled: boolean;
  description?: string;
}

export default () => {
  const configPath = join(process.cwd(), 'config', 'executors.yaml');

  if (!existsSync(configPath)) {
    return { executors: [] };
  }

  const fileContents = readFileSync(configPath, 'utf8');
  const config = yaml.load(fileContents) as { executors: ExecutorConfig[] };

  return {
    executors: config.executors || [],
  };
};
