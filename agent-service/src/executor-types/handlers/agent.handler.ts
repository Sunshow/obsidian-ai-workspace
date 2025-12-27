import { Executor } from '../../executors/interfaces/executor.interface';
import { InvokeResult, ConfigSchemaField, ActionDefinition } from '../interfaces/executor-type.interface';
import { BaseExecutorHandler } from './base.handler';

interface SkillDefinitionValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  fixedDef?: any;
}

export class AgentHandler extends BaseExecutorHandler {
  readonly typeName = 'agent';
  readonly displayName = 'Agent Service (内置)';
  readonly configSchema: Record<string, ConfigSchemaField> = {};

  private skillsService: any;

  setSkillsService(skillsService: any): void {
    this.skillsService = skillsService;
  }

  private validateSkillDefinition(skillDef: any): SkillDefinitionValidation {
    const errors: string[] = [];
    const warnings: string[] = [];
    const fixedDef = { ...skillDef };

    // Required fields check
    if (!fixedDef.name || typeof fixedDef.name !== 'string' || fixedDef.name.trim() === '') {
      errors.push('缺少必填字段 "name" (技能名称)');
    }

    // Generate id if missing
    if (!fixedDef.id || typeof fixedDef.id !== 'string' || fixedDef.id.trim() === '') {
      if (fixedDef.name && typeof fixedDef.name === 'string') {
        const generatedId = fixedDef.name
          .toLowerCase()
          .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
          .replace(/^-|-$/g, '');
        if (generatedId && /[a-z]/.test(generatedId)) {
          fixedDef.id = generatedId;
          warnings.push(`自动生成 id: "${generatedId}"`);
        } else {
          fixedDef.id = `skill-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          warnings.push(`自动生成随机 id: "${fixedDef.id}"`);
        }
      } else {
        fixedDef.id = `skill-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        warnings.push(`自动生成随机 id: "${fixedDef.id}"`);
      }
    }

    // Validate id format
    if (fixedDef.id && !/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(fixedDef.id)) {
      const cleanId = fixedDef.id
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/-+/g, '-');
      if (cleanId && cleanId !== fixedDef.id) {
        warnings.push(`id 格式修正: "${fixedDef.id}" -> "${cleanId}"`);
        fixedDef.id = cleanId;
      }
    }

    // Set default enabled
    if (typeof fixedDef.enabled !== 'boolean') {
      fixedDef.enabled = true;
      warnings.push('设置默认 enabled: true');
    }

    // Validate steps
    if (!Array.isArray(fixedDef.steps)) {
      errors.push('缺少必填字段 "steps" (执行步骤数组)');
    } else if (fixedDef.steps.length === 0) {
      errors.push('"steps" 数组不能为空');
    } else {
      fixedDef.steps = fixedDef.steps.map((step: any, index: number) => {
        const fixedStep = { ...step };
        
        // Validate step id
        if (!fixedStep.id) {
          fixedStep.id = `step${index + 1}`;
          warnings.push(`步骤 ${index + 1} 自动生成 id: "${fixedStep.id}"`);
        }

        // Validate executorType
        const validExecutorTypes = ['claudecode', 'playwright', 'puppeteer', 'agent', 'notification'];
        if (!fixedStep.executorType || !validExecutorTypes.includes(fixedStep.executorType)) {
          errors.push(`步骤 "${fixedStep.id}" 的 executorType "${fixedStep.executorType}" 无效，支持: ${validExecutorTypes.join(', ')}`);
        }

        // Validate action
        if (!fixedStep.action) {
          errors.push(`步骤 "${fixedStep.id}" 缺少 action 字段`);
        }

        return fixedStep;
      });
    }

    // Validate userInputs if present
    if (fixedDef.userInputs && !Array.isArray(fixedDef.userInputs)) {
      warnings.push('userInputs 不是数组，已设为空数组');
      fixedDef.userInputs = [];
    }

    // Set default builtinVariables
    if (!fixedDef.builtinVariables || typeof fixedDef.builtinVariables !== 'object') {
      fixedDef.builtinVariables = { currentDate: true, currentDatetime: true };
      warnings.push('设置默认 builtinVariables');
    }

    // Don't include schedule in the definition - it's handled separately
    // This is intentional as schedule is passed as a separate parameter

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      fixedDef: errors.length === 0 ? fixedDef : undefined,
    };
  }

  private extractJsonFromText(text: string): string {
    let jsonStr = text.trim();
    
    // Remove markdown code block if present
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }
    
    // Try to find JSON object in the text
    const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      jsonStr = objectMatch[0];
    }
    
    // Try to find JSON array in the text (for cases like userInputs or steps)
    if (!jsonStr.startsWith('{')) {
      const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        jsonStr = arrayMatch[0];
      }
    }
    
    return jsonStr;
  }

  getSupportedActions(): string[] {
    return ['register-skill', 'list-skills', 'delete-skill'];
  }

  getActionDefinitions(): ActionDefinition[] {
    return [
      {
        name: 'register-skill',
        displayName: '注册技能',
        description: '将技能定义注册到系统中',
        params: [
          {
            name: 'definition',
            type: 'string',
            required: true,
            description: '技能定义 JSON 字符串',
          },
          {
            name: 'schedule',
            type: 'string',
            required: false,
            description: '定时配置 JSON 字符串（可选，单独传入会合并到技能定义中）',
          },
        ],
        returns: {
          description: '注册结果，包含新技能的 ID',
          example: { success: true, id: 'my-skill', name: '我的技能' },
        },
      },
      {
        name: 'list-skills',
        displayName: '列出技能',
        description: '获取所有已注册的技能列表',
        params: [],
        returns: {
          description: '技能列表',
        },
      },
      {
        name: 'delete-skill',
        displayName: '删除技能',
        description: '删除指定的技能',
        params: [
          {
            name: 'id',
            type: 'string',
            required: true,
            description: '技能 ID',
          },
        ],
        returns: {
          description: '删除结果',
        },
      },
    ];
  }

  async invoke(
    executor: Executor,
    action: string,
    params: any,
  ): Promise<InvokeResult> {
    if (!this.skillsService) {
      return {
        success: false,
        error: 'SkillsService not initialized',
      };
    }

    try {
      switch (action) {
        case 'register-skill': {
          const { definition, schedule } = params;
          if (!definition) {
            return {
              success: false,
              error: 'definition is required',
            };
          }

          let skillDef: any;
          if (typeof definition === 'string') {
            // Extract JSON from string (may contain markdown code blocks or extra text)
            const jsonStr = this.extractJsonFromText(definition);
            
            try {
              skillDef = JSON.parse(jsonStr);
            } catch (e) {
              return {
                success: false,
                error: `JSON 解析失败: ${e instanceof Error ? e.message : 'parse error'}`,
                data: {
                  hint: '请确保输出纯 JSON，不要包含 markdown 代码块或其他文本',
                  extractedJson: jsonStr.substring(0, 500) + (jsonStr.length > 500 ? '...' : ''),
                  originalInput: definition.substring(0, 300) + (definition.length > 300 ? '...' : ''),
                },
              };
            }
          } else {
            skillDef = definition;
          }

          // Validate and fix the skill definition
          const validation = this.validateSkillDefinition(skillDef);
          
          if (!validation.valid) {
            return {
              success: false,
              error: `技能定义校验失败:\n${validation.errors.map(e => `  - ${e}`).join('\n')}`,
              data: {
                errors: validation.errors,
                warnings: validation.warnings,
                receivedDefinition: {
                  id: skillDef.id,
                  name: skillDef.name,
                  stepsCount: Array.isArray(skillDef.steps) ? skillDef.steps.length : 0,
                },
              },
            };
          }

          // Use the fixed definition
          skillDef = validation.fixedDef;

          // Merge schedule if provided separately
          if (schedule && schedule !== 'none' && schedule !== 'null') {
            try {
              const scheduleStr = this.extractJsonFromText(
                typeof schedule === 'string' ? schedule : JSON.stringify(schedule)
              );
              
              const scheduleObj = JSON.parse(scheduleStr);
              if (scheduleObj && scheduleObj.enabled) {
                skillDef.schedule = scheduleObj;
              }
            } catch (e) {
              // Ignore invalid schedule, skill can still be registered without it
              // But add a warning in the response
            }
          }

          const result = this.skillsService.createSkill(skillDef);
          
          const response: any = {
            message: '技能注册成功',
            id: result.id,
            name: result.name,
          };
          
          if (validation.warnings.length > 0) {
            response.warnings = validation.warnings;
          }
          
          if (skillDef.schedule?.enabled) {
            response.scheduleEnabled = true;
            response.scheduleCron = skillDef.schedule.cron;
          }
          
          return {
            success: true,
            data: response,
          };
        }

        case 'list-skills': {
          const skills = this.skillsService.getAllSkillDefinitions();
          return {
            success: true,
            data: skills,
          };
        }

        case 'delete-skill': {
          const { id } = params;
          if (!id) {
            return {
              success: false,
              error: 'id is required',
            };
          }
          
          // Check if skill is reserved
          const skill = this.skillsService.getSkillById(id);
          if (skill?.reserved) {
            return {
              success: false,
              error: `技能 "${id}" 是保留技能，不可删除`,
            };
          }
          
          this.skillsService.deleteSkill(id);
          return {
            success: true,
            data: { message: `技能 ${id} 已删除` },
          };
        }

        default:
          return {
            success: false,
            error: `Unsupported action: ${action}. Supported: ${this.getSupportedActions().join(', ')}`,
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
