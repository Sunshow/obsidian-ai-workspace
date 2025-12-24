import { Injectable, Logger } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import {
  SkillDefinition,
  SkillExecutionResult,
  SkillExecutionEvent,
} from './interfaces/skill-definition.interface';
import { SkillExecutorService } from './skill-executor.service';

export interface QueuedTask {
  id: string;
  skillId: string;
  skillName: string;
  triggerType: 'scheduled' | 'manual';
  userInputs: Record<string, any>;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  status: 'queued' | 'running' | 'completed' | 'failed';
  error?: string;
}

export interface TaskQueueStatus {
  currentTask: QueuedTask | null;
  queuedTasks: QueuedTask[];
  recentTasks: QueuedTask[];
}

export class TaskBusyError extends Error {
  constructor(currentTask: QueuedTask) {
    super(`任务执行中，请稍候。当前任务: ${currentTask.skillName}`);
    this.name = 'TaskBusyError';
  }
}

const MAX_RECENT_TASKS = 10;

@Injectable()
export class TaskQueueService {
  private readonly logger = new Logger(TaskQueueService.name);
  private queue: QueuedTask[] = [];
  private currentTask: QueuedTask | null = null;
  private recentTasks: QueuedTask[] = [];
  private isProcessing = false;
  private taskExecutor: ((task: QueuedTask) => Promise<SkillExecutionResult>) | null = null;

  constructor(
    private readonly skillExecutorService: SkillExecutorService,
  ) {}

  setTaskExecutor(executor: (task: QueuedTask) => Promise<SkillExecutionResult>) {
    this.taskExecutor = executor;
  }

  private generateTaskId(): string {
    return `task-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }

  enqueueScheduledTask(
    skill: SkillDefinition,
    userInputs: Record<string, any>,
  ): QueuedTask {
    const task: QueuedTask = {
      id: this.generateTaskId(),
      skillId: skill.id,
      skillName: skill.name,
      triggerType: 'scheduled',
      userInputs,
      createdAt: new Date(),
      status: 'queued',
    };

    this.queue.push(task);
    this.logger.log(`Scheduled task enqueued: ${task.id} (${skill.name}), queue length: ${this.queue.length}`);

    this.processQueue();
    return task;
  }

  async executeManualTask(
    skill: SkillDefinition,
    userInputs: Record<string, any>,
  ): Promise<SkillExecutionResult> {
    if (this.currentTask) {
      throw new TaskBusyError(this.currentTask);
    }

    const task: QueuedTask = {
      id: this.generateTaskId(),
      skillId: skill.id,
      skillName: skill.name,
      triggerType: 'manual',
      userInputs,
      createdAt: new Date(),
      status: 'running',
      startedAt: new Date(),
    };

    this.currentTask = task;
    this.logger.log(`Manual task started: ${task.id} (${skill.name})`);

    try {
      const result = await this.skillExecutorService.executeSkill(skill, userInputs);
      
      task.status = result.success ? 'completed' : 'failed';
      task.completedAt = new Date();
      if (!result.success) {
        task.error = result.error;
      }
      
      this.addToRecentTasks(task);
      return result;
    } catch (error) {
      task.status = 'failed';
      task.completedAt = new Date();
      task.error = error instanceof Error ? error.message : 'Unknown error';
      this.addToRecentTasks(task);
      throw error;
    } finally {
      this.currentTask = null;
      this.processQueue();
    }
  }

  /**
   * Execute manual task with real-time event streaming
   */
  executeManualTaskWithEvents(
    skill: SkillDefinition,
    userInputs: Record<string, any>,
  ): Observable<SkillExecutionEvent> {
    const subject = new Subject<SkillExecutionEvent>();

    if (this.currentTask) {
      // Emit error and complete immediately
      setTimeout(() => {
        subject.next({
          type: 'execution-error',
          error: `任务执行中，请稍候。当前任务: ${this.currentTask!.skillName}`,
          result: {
            success: false,
            skillId: skill.id,
            stepResults: [],
            error: `任务执行中，请稍候。当前任务: ${this.currentTask!.skillName}`,
            duration: 0,
          },
        });
        subject.complete();
      }, 0);
      return subject.asObservable();
    }

    const task: QueuedTask = {
      id: this.generateTaskId(),
      skillId: skill.id,
      skillName: skill.name,
      triggerType: 'manual',
      userInputs,
      createdAt: new Date(),
      status: 'running',
      startedAt: new Date(),
    };

    this.currentTask = task;
    this.logger.log(`Manual task with events started: ${task.id} (${skill.name})`);

    // Subscribe to skill executor events and forward them
    const subscription = this.skillExecutorService.executeSkillWithEvents(skill, userInputs).subscribe({
      next: (event) => {
        subject.next(event);
        
        // Update task status on completion
        if (event.type === 'execution-complete' || event.type === 'execution-error') {
          task.status = event.result?.success ? 'completed' : 'failed';
          task.completedAt = new Date();
          if (!event.result?.success) {
            task.error = event.result?.error;
          }
          this.addToRecentTasks(task);
          this.currentTask = null;
          this.processQueue();
        }
      },
      error: (error) => {
        task.status = 'failed';
        task.completedAt = new Date();
        task.error = error instanceof Error ? error.message : 'Unknown error';
        this.addToRecentTasks(task);
        this.currentTask = null;
        this.processQueue();
        subject.error(error);
      },
      complete: () => {
        subject.complete();
      },
    });

    return subject.asObservable();
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.currentTask || this.queue.length === 0) {
      return;
    }

    if (!this.taskExecutor) {
      this.logger.warn('Task executor not set, cannot process queue');
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0 && !this.currentTask) {
      const task = this.queue.shift()!;
      task.status = 'running';
      task.startedAt = new Date();
      this.currentTask = task;

      this.logger.log(`Processing queued task: ${task.id} (${task.skillName}), remaining: ${this.queue.length}`);

      try {
        const result = await this.taskExecutor(task);
        task.status = result.success ? 'completed' : 'failed';
        task.completedAt = new Date();
        if (!result.success) {
          task.error = result.error;
        }
      } catch (error) {
        task.status = 'failed';
        task.completedAt = new Date();
        task.error = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Task ${task.id} failed: ${task.error}`);
      }

      this.addToRecentTasks(task);
      this.currentTask = null;
    }

    this.isProcessing = false;
  }

  private addToRecentTasks(task: QueuedTask): void {
    this.recentTasks.unshift(task);
    if (this.recentTasks.length > MAX_RECENT_TASKS) {
      this.recentTasks = this.recentTasks.slice(0, MAX_RECENT_TASKS);
    }
  }

  getStatus(): TaskQueueStatus {
    return {
      currentTask: this.currentTask,
      queuedTasks: [...this.queue],
      recentTasks: [...this.recentTasks],
    };
  }

  isBusy(): boolean {
    return this.currentTask !== null;
  }

  getCurrentTask(): QueuedTask | null {
    return this.currentTask;
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  cancelQueuedTask(taskId: string): boolean {
    const index = this.queue.findIndex(t => t.id === taskId);
    if (index === -1) {
      return false;
    }
    this.queue.splice(index, 1);
    this.logger.log(`Cancelled queued task: ${taskId}`);
    return true;
  }
}
