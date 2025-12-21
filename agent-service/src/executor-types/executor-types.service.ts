import { Injectable, Logger } from '@nestjs/common';
import { ExecutorTypeHandler } from './interfaces/executor-type.interface';
import { ClaudeCodeHandler } from './handlers/claudecode.handler';
import { PuppeteerHandler } from './handlers/puppeteer.handler';
import { PlaywrightHandler } from './handlers/playwright.handler';

@Injectable()
export class ExecutorTypesService {
  private readonly logger = new Logger(ExecutorTypesService.name);
  private readonly handlers: Map<string, ExecutorTypeHandler> = new Map();

  constructor() {
    this.registerBuiltInHandlers();
  }

  private registerBuiltInHandlers() {
    const builtInHandlers: ExecutorTypeHandler[] = [
      new ClaudeCodeHandler(),
      new PuppeteerHandler(),
      new PlaywrightHandler(),
    ];

    for (const handler of builtInHandlers) {
      this.register(handler);
    }
  }

  register(handler: ExecutorTypeHandler): void {
    if (this.handlers.has(handler.typeName)) {
      this.logger.warn(`Handler for type ${handler.typeName} already registered, overwriting`);
    }
    this.handlers.set(handler.typeName, handler);
    this.logger.log(`Registered handler for type: ${handler.typeName}`);
  }

  getHandler(typeName: string): ExecutorTypeHandler | undefined {
    return this.handlers.get(typeName);
  }

  getAllTypes(): Array<{
    name: string;
    displayName: string;
    configSchema: Record<string, any>;
    supportedActions: string[];
  }> {
    return Array.from(this.handlers.values()).map((handler) => ({
      name: handler.typeName,
      displayName: handler.displayName,
      configSchema: handler.configSchema,
      supportedActions: handler.getSupportedActions(),
    }));
  }

  hasType(typeName: string): boolean {
    return this.handlers.has(typeName);
  }
}
