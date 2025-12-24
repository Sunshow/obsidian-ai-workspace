import { Module, forwardRef } from '@nestjs/common';
import { SkillsController } from './skills.controller';
import { SkillsService } from './skills.service';
import { SkillExecutorService } from './skill-executor.service';
import { SkillSchedulerService } from './skill-scheduler.service';
import { TaskQueueService } from './task-queue.service';
import { ExecutorsModule } from '../executors/executors.module';

@Module({
  imports: [forwardRef(() => ExecutorsModule)],
  controllers: [SkillsController],
  providers: [SkillsService, SkillExecutorService, SkillSchedulerService, TaskQueueService],
  exports: [SkillsService, SkillExecutorService, SkillSchedulerService, TaskQueueService],
})
export class SkillsModule {}
