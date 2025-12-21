import { Module } from '@nestjs/common';
import { ExecutorsController } from './executors.controller';
import { ExecutorsService } from './executors.service';

@Module({
  controllers: [ExecutorsController],
  providers: [ExecutorsService],
  exports: [ExecutorsService],
})
export class ExecutorsModule {}
