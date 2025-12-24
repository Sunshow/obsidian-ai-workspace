import { Module, forwardRef } from '@nestjs/common';
import { SkillsController } from './skills.controller';
import { SkillsService } from './skills.service';
import { SkillExecutorService } from './skill-executor.service';
import { SkillSchedulerService } from './skill-scheduler.service';
import { ExecutorsModule } from '../executors/executors.module';

@Module({
  imports: [forwardRef(() => ExecutorsModule)],
  controllers: [SkillsController],
  providers: [SkillsService, SkillExecutorService, SkillSchedulerService],
  exports: [SkillsService, SkillExecutorService, SkillSchedulerService],
})
export class SkillsModule {}
