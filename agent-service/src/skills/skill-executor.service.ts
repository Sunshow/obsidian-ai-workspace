import { Injectable, Logger } from '@nestjs/common';
import { ExecutorsService } from '../executors/executors.service';
import { ExecutorTypesService } from '../executor-types/executor-types.service';
import {
  SkillDefinition,
  SkillExecutionContext,
  SkillExecutionResult,
  BuiltinVariableInfo,
  SkillStep,
} from './interfaces/skill-definition.interface';

@Injectable()
export class SkillExecutorService {
  private readonly logger = new Logger(SkillExecutorService.name);

  constructor(
    private readonly executorsService: ExecutorsService,
    private readonly executorTypesService: ExecutorTypesService,
  ) {}

  private formatLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatLocalTime(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  private formatLocalDatetime(date: Date): string {
    return `${this.formatLocalDate(date)} ${this.formatLocalTime(date)}`;
  }

  getBuiltinVariables(): BuiltinVariableInfo[] {
    const now = new Date();
    return [
      {
        name: 'currentDate',
        description: '当前日期',
        example: this.formatLocalDate(now),
      },
      {
        name: 'currentTime',
        description: '当前时间',
        example: this.formatLocalTime(now),
      },
      {
        name: 'currentDatetime',
        description: '当前日期时间',
        example: this.formatLocalDatetime(now),
      },
      {
        name: 'randomId',
        description: '8位随机ID',
        example: Math.random().toString(36).substring(2, 10),
      },
    ];
  }

  private generateBuiltinValues(
    builtinVariables: Record<string, boolean | undefined>,
  ): Record<string, string> {
    const values: Record<string, string> = {};
    const now = new Date();

    if (builtinVariables.currentDate) {
      values.currentDate = this.formatLocalDate(now);
    }
    if (builtinVariables.currentTime) {
      values.currentTime = this.formatLocalTime(now);
    }
    if (builtinVariables.currentDatetime) {
      values.currentDatetime = this.formatLocalDatetime(now);
    }
    if (builtinVariables.randomId) {
      values.randomId = Math.random().toString(36).substring(2, 10);
    }

    return values;
  }

  // Escape special characters in replacement string for String.replace()
  // $ has special meaning in replacement strings ($&, $', $1, etc.)
  private escapeReplacement(str: string): string {
    return str.replace(/\$/g, '$$$$');
  }

  private replaceVariables(
    template: any,
    context: SkillExecutionContext,
  ): any {
    if (typeof template === 'string') {
      let result = template;

      // Replace builtin variables
      for (const [key, value] of Object.entries(context.builtinValues || {})) {
        result = result.replace(
          new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
          this.escapeReplacement(value),
        );
      }

      // Replace user input variables
      for (const [key, value] of Object.entries(context.userInputValues || {})) {
        const strValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
        result = result.replace(
          new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
          this.escapeReplacement(strValue),
        );
      }

      // Replace step output variables (supports nested paths like stepId.data.field)
      for (const [stepId, output] of Object.entries(context.stepOutputs || {})) {
        // Direct step output replacement
        const outputStr = typeof output === 'object' ? JSON.stringify(output) : String(output);
        result = result.replace(
          new RegExp(`\\{\\{${stepId}\\}\\}`, 'g'),
          this.escapeReplacement(outputStr),
        );

        // Nested path replacement
        const nestedPattern = new RegExp(`\\{\\{${stepId}\\.([^}]+)\\}\\}`, 'g');
        let match;
        while ((match = nestedPattern.exec(template)) !== null) {
          const path = match[1];
          const value = this.getNestedValue(output, path);
          const strValue = typeof value === 'object' ? JSON.stringify(value) : String(value ?? '');
          result = result.replace(match[0], this.escapeReplacement(strValue));
        }
      }

      return result;
    }

    if (Array.isArray(template)) {
      return template.map((item) => this.replaceVariables(item, context));
    }

    if (typeof template === 'object' && template !== null) {
      const result: Record<string, any> = {};
      for (const [key, value] of Object.entries(template)) {
        result[key] = this.replaceVariables(value, context);
      }
      return result;
    }

    return template;
  }

  private getNestedValue(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }
    return current;
  }

  private evaluateCondition(
    condition: string,
    context: SkillExecutionContext,
  ): boolean {
    if (!condition) {
      return true;
    }

    try {
      const replaced = this.replaceVariables(condition, context);
      // Simple evaluation - in production, use a safer expression evaluator
      // eslint-disable-next-line no-eval
      return Boolean(eval(replaced));
    } catch (error) {
      this.logger.warn(`Failed to evaluate condition: ${condition}`, error);
      return true;
    }
  }

  private async getExecutorByType(executorType: string, executorName?: string): Promise<string> {
    if (executorName) {
      return executorName;
    }

    // Find first enabled executor of this type
    const executors = await this.executorsService.findAll();
    const executor = executors.find(
      (e: { type: string; enabled: boolean }) => e.type === executorType && e.enabled,
    );

    if (!executor) {
      throw new Error(`No enabled executor found for type: ${executorType}`);
    }

    return executor.name;
  }

  async executeSkill(
    skill: SkillDefinition,
    userInputValues: Record<string, any>,
  ): Promise<SkillExecutionResult> {
    const startTime = Date.now();
    const stepResults: SkillExecutionResult['stepResults'] = [];

    this.logger.log(`Executing skill: ${skill.id}`);

    // Build execution context
    const context: SkillExecutionContext = {
      builtinValues: this.generateBuiltinValues(skill.builtinVariables || {}),
      userInputValues: userInputValues || {},
      stepOutputs: {},
    };

    try {
      // Execute each step
      for (const step of skill.steps) {
        const stepStartTime = Date.now();

        // Check condition
        if (!this.evaluateCondition(step.condition || '', context)) {
          this.logger.log(`Skipping step ${step.id}: condition not met`);
          stepResults.push({
            stepId: step.id,
            stepName: step.name,
            success: true,
            output: null,
            duration: Date.now() - stepStartTime,
          });
          continue;
        }

        try {
          // Replace variables in params
          const params = this.replaceVariables(step.params || {}, context);

          // 对于 claudecode 执行器，传递步骤级别的 model 配置
          if (step.executorType === 'claudecode') {
            if (skill.id === 'skill-creator' && !step.model) {
              // 技能创建器使用专用环境变量
              params.model = process.env.SKILL_CREATOR_MODEL || 'claude-opus-4-5-20251101';
            } else if (step.model) {
              params.model = step.model;
            }
          }

          let result: any;

          // Check if this is an agent (built-in) executor type
          if (step.executorType === 'agent') {
            const handler = this.executorTypesService.getHandler('agent');
            if (!handler) {
              throw new Error('Agent handler not found');
            }
            
            this.logger.log(
              `Executing step ${step.id}: ${step.name} with built-in agent handler`,
            );
            
            result = await handler.invoke(
              { name: 'agent', type: 'agent', endpoint: '', healthPath: '', enabled: true } as any,
              step.action,
              params,
            );
          } else {
            // Get executor name for external executors
            const executorName = await this.getExecutorByType(
              step.executorType,
              step.executorName,
            );

            this.logger.log(
              `Executing step ${step.id}: ${step.name} with executor ${executorName}`,
            );

            // Invoke executor
            result = await this.executorsService.invoke(
              executorName,
              step.action,
              params,
            );
          }

          if (!result.success) {
            stepResults.push({
              stepId: step.id,
              stepName: step.name,
              success: false,
              error: result.error,
              duration: Date.now() - stepStartTime,
            });

            return {
              success: false,
              skillId: skill.id,
              stepResults,
              error: `Step ${step.id} failed: ${result.error}`,
              duration: Date.now() - startTime,
            };
          }

          // Store output
          if (step.outputVariable) {
            context.stepOutputs[step.outputVariable] = result;
          }
          context.stepOutputs[step.id] = result;

          stepResults.push({
            stepId: step.id,
            stepName: step.name,
            success: true,
            output: result,
            duration: Date.now() - stepStartTime,
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          stepResults.push({
            stepId: step.id,
            stepName: step.name,
            success: false,
            error: errorMessage,
            duration: Date.now() - stepStartTime,
          });

          return {
            success: false,
            skillId: skill.id,
            stepResults,
            error: `Step ${step.id} failed: ${errorMessage}`,
            duration: Date.now() - startTime,
          };
        }
      }

      // Get final output from last step
      const lastStep = skill.steps[skill.steps.length - 1];
      const finalOutput = lastStep?.outputVariable
        ? context.stepOutputs[lastStep.outputVariable]
        : context.stepOutputs[lastStep?.id];

      return {
        success: true,
        skillId: skill.id,
        stepResults,
        finalOutput,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        skillId: skill.id,
        stepResults,
        error: errorMessage,
        duration: Date.now() - startTime,
      };
    }
  }
}
