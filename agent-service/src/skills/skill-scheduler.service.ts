import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject, forwardRef } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import {
  SkillDefinition,
  SkillSchedule,
  ScheduleStatus,
  ExecutionRecord,
  SkillExecutionResult,
} from './interfaces/skill-definition.interface';
import { SkillExecutorService } from './skill-executor.service';
import { TaskQueueService, QueuedTask } from './task-queue.service';

const MAX_HISTORY_RECORDS = 100;

@Injectable()
export class SkillSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SkillSchedulerService.name);
  private executionHistory: ExecutionRecord[] = [];
  private lastExecutionMap: Map<string, { time: Date; success: boolean }> = new Map();
  private skillsGetter: (() => SkillDefinition[]) | null = null;

  constructor(
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly skillExecutorService: SkillExecutorService,
    @Inject(forwardRef(() => TaskQueueService))
    private readonly taskQueueService: TaskQueueService,
  ) {}

  setSkillsGetter(getter: () => SkillDefinition[]) {
    this.skillsGetter = getter;
  }

  onModuleInit() {
    // Skills will be loaded after SkillsService initializes and calls initializeSchedules
    this.logger.log('SkillSchedulerService initialized, waiting for skills...');
  }

  onModuleDestroy() {
    this.clearAllSchedules();
  }

  initializeSchedules() {
    if (!this.skillsGetter) {
      this.logger.warn('Skills getter not set, cannot initialize schedules');
      return;
    }

    const skills = this.skillsGetter();
    for (const skill of skills) {
      if (skill.enabled && skill.schedule?.enabled) {
        this.scheduleSkill(skill);
      }
    }
    this.logger.log(`Initialized ${this.getScheduledCount()} scheduled skills`);
  }

  private getScheduledCount(): number {
    let count = 0;
    try {
      const cronJobs = this.schedulerRegistry.getCronJobs();
      count += cronJobs.size;
    } catch {}
    try {
      const intervals = this.schedulerRegistry.getIntervals();
      count += intervals.length;
    } catch {}
    return count;
  }

  scheduleSkill(skill: SkillDefinition): void {
    if (!skill.schedule?.enabled) {
      return;
    }

    // Remove existing schedule first
    this.unscheduleSkill(skill.id);

    const schedule = skill.schedule;
    const jobName = `skill-${skill.id}`;

    if (schedule.cron) {
      this.scheduleCronJob(skill, jobName, schedule);
    } else if (schedule.interval) {
      this.scheduleIntervalJob(skill, jobName, schedule);
    } else {
      this.logger.warn(`Skill ${skill.id} has schedule enabled but no cron or interval defined`);
    }
  }

  private scheduleCronJob(skill: SkillDefinition, jobName: string, schedule: SkillSchedule): void {
    const job = new CronJob(
      schedule.cron!,
      () => this.executeScheduledSkill(skill),
      null,
      true,
      schedule.timezone || 'Asia/Shanghai',
    );

    this.schedulerRegistry.addCronJob(jobName, job);
    this.logger.log(`Scheduled cron job for skill ${skill.id}: ${schedule.cron}`);
  }

  private scheduleIntervalJob(skill: SkillDefinition, jobName: string, schedule: SkillSchedule): void {
    const intervalId = setInterval(
      () => this.executeScheduledSkill(skill),
      schedule.interval!,
    );

    this.schedulerRegistry.addInterval(jobName, intervalId);
    this.logger.log(`Scheduled interval job for skill ${skill.id}: ${schedule.interval}ms`);
  }

  unscheduleSkill(skillId: string): void {
    const jobName = `skill-${skillId}`;

    try {
      this.schedulerRegistry.deleteCronJob(jobName);
      this.logger.log(`Removed cron job for skill ${skillId}`);
    } catch {}

    try {
      this.schedulerRegistry.deleteInterval(jobName);
      this.logger.log(`Removed interval job for skill ${skillId}`);
    } catch {}
  }

  clearAllSchedules(): void {
    try {
      const cronJobs = this.schedulerRegistry.getCronJobs();
      cronJobs.forEach((_, name) => {
        if (name.startsWith('skill-')) {
          this.schedulerRegistry.deleteCronJob(name);
        }
      });
    } catch {}

    try {
      const intervals = this.schedulerRegistry.getIntervals();
      intervals.forEach((name) => {
        if (name.startsWith('skill-')) {
          this.schedulerRegistry.deleteInterval(name);
        }
      });
    } catch {}
  }

  private async executeScheduledSkill(skill: SkillDefinition): Promise<void> {
    const triggeredAt = new Date();

    this.logger.log(`Enqueuing scheduled skill: ${skill.id}`);

    // 从 userInputs 的 defaultValue 获取默认输入
    const defaultInputs: Record<string, any> = {};
    skill.userInputs?.forEach(input => {
      if (input.defaultValue !== undefined) {
        defaultInputs[input.name] = input.defaultValue;
      }
    });

    // 通过队列执行，不直接执行
    this.taskQueueService.enqueueScheduledTask(skill, defaultInputs);
  }

  async executeScheduledSkillDirectly(skill: SkillDefinition, userInputs: Record<string, any>): Promise<SkillExecutionResult> {
    const triggeredAt = new Date();
    const recordId = `${skill.id}-${triggeredAt.getTime()}`;

    this.logger.log(`Executing scheduled skill directly: ${skill.id}`);

    let result: SkillExecutionResult;
    let retryCount = 0;
    const maxRetries = skill.schedule?.retryOnFailure ? (skill.schedule.maxRetries || 3) : 0;

    do {
      if (retryCount > 0) {
        this.logger.log(`Retrying skill ${skill.id}, attempt ${retryCount}/${maxRetries}`);
      }

      result = await this.skillExecutorService.executeSkill(skill, userInputs);

      if (result.success || retryCount >= maxRetries) {
        break;
      }
      retryCount++;
    } while (retryCount <= maxRetries);

    const completedAt = new Date();
    const record: ExecutionRecord = {
      id: recordId,
      skillId: skill.id,
      skillName: skill.name,
      triggeredAt,
      completedAt,
      triggerType: 'scheduled',
      success: result.success,
      error: result.error,
      duration: result.duration,
    };

    this.addExecutionRecord(record);
    this.lastExecutionMap.set(skill.id, { time: completedAt, success: result.success });

    if (result.success) {
      this.logger.log(`Scheduled skill ${skill.id} completed successfully`);
    } else {
      this.logger.error(`Scheduled skill ${skill.id} failed: ${result.error}`);
    }

    return result;
  }

  async triggerNow(skill: SkillDefinition, userInputs?: Record<string, any>): Promise<SkillExecutionResult> {
    const triggeredAt = new Date();
    const recordId = `${skill.id}-${triggeredAt.getTime()}`;

    this.logger.log(`Manually triggering skill: ${skill.id}`);

    // 如果没有传入 userInputs，从 userInputs 的 defaultValue 获取默认输入
    let inputs = userInputs;
    if (!inputs) {
      inputs = {};
      skill.userInputs?.forEach(input => {
        if (input.defaultValue !== undefined) {
          inputs![input.name] = input.defaultValue;
        }
      });
    }
    const result = await this.skillExecutorService.executeSkill(skill, inputs);

    const completedAt = new Date();
    const record: ExecutionRecord = {
      id: recordId,
      skillId: skill.id,
      skillName: skill.name,
      triggeredAt,
      completedAt,
      triggerType: 'manual',
      success: result.success,
      error: result.error,
      duration: result.duration,
    };

    this.addExecutionRecord(record);
    this.lastExecutionMap.set(skill.id, { time: completedAt, success: result.success });

    return result;
  }

  private addExecutionRecord(record: ExecutionRecord): void {
    this.executionHistory.unshift(record);
    if (this.executionHistory.length > MAX_HISTORY_RECORDS) {
      this.executionHistory = this.executionHistory.slice(0, MAX_HISTORY_RECORDS);
    }
  }

  getScheduleStatus(skills: SkillDefinition[]): ScheduleStatus[] {
    return skills
      .filter((s) => s.schedule)
      .map((skill) => {
        const jobName = `skill-${skill.id}`;
        let nextExecution: Date | undefined;

        try {
          const cronJob = this.schedulerRegistry.getCronJob(jobName);
          nextExecution = cronJob.nextDate().toJSDate();
        } catch {}

        const lastExec = this.lastExecutionMap.get(skill.id);

        return {
          skillId: skill.id,
          skillName: skill.name,
          enabled: skill.schedule?.enabled || false,
          cron: skill.schedule?.cron,
          interval: skill.schedule?.interval,
          timezone: skill.schedule?.timezone,
          nextExecution,
          lastExecution: lastExec?.time,
          lastSuccess: lastExec?.success,
        };
      });
  }

  getExecutionHistory(skillId?: string, limit: number = 50): ExecutionRecord[] {
    let records = this.executionHistory;
    if (skillId) {
      records = records.filter((r) => r.skillId === skillId);
    }
    return records.slice(0, limit);
  }
}
