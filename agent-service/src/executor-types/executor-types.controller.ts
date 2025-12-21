import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { ExecutorTypesService } from './executor-types.service';

@Controller('api/executor-types')
export class ExecutorTypesController {
  constructor(private readonly executorTypesService: ExecutorTypesService) {}

  @Get()
  async findAll() {
    return this.executorTypesService.getAllTypes();
  }

  @Get(':type')
  async findOne(@Param('type') type: string) {
    const handler = this.executorTypesService.getHandler(type);
    if (!handler) {
      throw new NotFoundException(`Executor type ${type} not found`);
    }
    return {
      name: handler.typeName,
      displayName: handler.displayName,
      configSchema: handler.configSchema,
      supportedActions: handler.getSupportedActions(),
    };
  }
}
