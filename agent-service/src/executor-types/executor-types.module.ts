import { Module, Global } from '@nestjs/common';
import { ExecutorTypesService } from './executor-types.service';
import { ExecutorTypesController } from './executor-types.controller';

@Global()
@Module({
  controllers: [ExecutorTypesController],
  providers: [ExecutorTypesService],
  exports: [ExecutorTypesService],
})
export class ExecutorTypesModule {}
