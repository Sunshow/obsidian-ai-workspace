import { Module, forwardRef } from '@nestjs/common';
import { SkillsController } from './skills.controller';
import { SkillsService } from './skills.service';
import { SkillExecutorService } from './skill-executor.service';
import { ExecutorsModule } from '../executors/executors.module';

@Module({
  imports: [forwardRef(() => ExecutorsModule)],
  controllers: [SkillsController],
  providers: [SkillsService, SkillExecutorService],
  exports: [SkillsService, SkillExecutorService],
})
export class SkillsModule {}
