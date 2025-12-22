import { Executor } from '../../executors/interfaces/executor.interface';
import { InvokeResult, ConfigSchemaField, ActionDefinition } from '../interfaces/executor-type.interface';
import { BaseExecutorHandler } from './base.handler';

export class AgentHandler extends BaseExecutorHandler {
  readonly typeName = 'agent';
  readonly displayName = 'Agent Service (内置)';
  readonly configSchema: Record<string, ConfigSchemaField> = {};

  private skillsService: any;

  setSkillsService(skillsService: any): void {
    this.skillsService = skillsService;
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
          const { definition } = params;
          if (!definition) {
            return {
              success: false,
              error: 'definition is required',
            };
          }

          let skillDef: any;
          if (typeof definition === 'string') {
            // Try to parse JSON from string (may contain markdown code blocks)
            let jsonStr = definition.trim();
            
            // Remove markdown code block if present
            const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            if (jsonMatch) {
              jsonStr = jsonMatch[1].trim();
            }
            
            try {
              skillDef = JSON.parse(jsonStr);
            } catch (e) {
              return {
                success: false,
                error: `Invalid JSON: ${e instanceof Error ? e.message : 'parse error'}`,
              };
            }
          } else {
            skillDef = definition;
          }

          // Ensure skill has a valid id
          if (!skillDef.id || skillDef.id.trim() === '') {
            // Try to generate from name first
            if (skillDef.name) {
              const generatedId = skillDef.name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '');
              if (generatedId) {
                skillDef.id = generatedId;
              }
            }
            // If still no valid id, generate a random one
            if (!skillDef.id || skillDef.id.trim() === '') {
              skillDef.id = `skill-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
            }
          }

          const result = this.skillsService.createSkill(skillDef);
          return {
            success: true,
            data: {
              message: '技能注册成功',
              id: result.id,
              name: result.name,
            },
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
