import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ExecutorTypeHandler, ActionDefinition } from './interfaces/executor-type.interface';
import { ClaudeCodeHandler } from './handlers/claudecode.handler';
import { PuppeteerHandler } from './handlers/puppeteer.handler';
import { PlaywrightHandler } from './handlers/playwright.handler';
import { AgentHandler } from './handlers/agent.handler';

@Injectable()
export class ExecutorTypesService {
  private readonly logger = new Logger(ExecutorTypesService.name);
  private readonly handlers: Map<string, ExecutorTypeHandler> = new Map();
  private agentHandler: AgentHandler;

  constructor() {
    this.registerBuiltInHandlers();
  }

  private registerBuiltInHandlers() {
    this.agentHandler = new AgentHandler();
    
    const builtInHandlers: ExecutorTypeHandler[] = [
      new ClaudeCodeHandler(),
      new PuppeteerHandler(),
      new PlaywrightHandler(),
      this.agentHandler,
    ];

    for (const handler of builtInHandlers) {
      this.register(handler);
    }
  }

  setSkillsService(skillsService: any): void {
    this.agentHandler.setSkillsService(skillsService);
    this.logger.log('SkillsService injected into AgentHandler');
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
    actionDefinitions: ActionDefinition[];
  }> {
    return Array.from(this.handlers.values()).map((handler) => ({
      name: handler.typeName,
      displayName: handler.displayName,
      configSchema: handler.configSchema,
      supportedActions: handler.getSupportedActions(),
      actionDefinitions: handler.getActionDefinitions(),
    }));
  }

  hasType(typeName: string): boolean {
    return this.handlers.has(typeName);
  }
}
