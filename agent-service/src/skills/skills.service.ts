import { Injectable, Logger, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import * as yaml from 'js-yaml';
import { ExecutorsService } from '../executors/executors.service';
import { ExecutorTypesService } from '../executor-types/executor-types.service';
import { SkillConfig, SmartFetchConfig, SmartFetchResult } from './interfaces/skill.interface';
import { SmartFetchDto, UpdateSkillConfigDto } from './dto/smart-fetch.dto';
import {
  SkillDefinition,
  SkillExecutionResult,
  SkillSchedule,
  ScheduleStatus,
  ExecutionRecord,
} from './interfaces/skill-definition.interface';
import { CreateSkillDto, UpdateSkillDto } from './dto/create-skill.dto';
import { SkillExecutorService } from './skill-executor.service';
import { SkillSchedulerService } from './skill-scheduler.service';
import { UpdateScheduleDto } from './dto/schedule.dto';

const DEFAULT_PROMPT = `请根据以下网页内容生成一份结构化的 Markdown 笔记。要求：
1. 提取关键信息和要点
2. 使用清晰的标题层级
3. 保留重要的数据和观点
4. 添加适当的总结

网页标题: {{title}}
网页内容:
{{content}}`;

@Injectable()
export class SkillsService implements OnModuleInit {
  private readonly logger = new Logger(SkillsService.name);
  private config: SkillConfig & { skills?: SkillDefinition[] };
  private readonly configPath: string;

  constructor(
    private readonly executorsService: ExecutorsService,
    private readonly skillExecutorService: SkillExecutorService,
    private readonly executorTypesService: ExecutorTypesService,
    private readonly skillSchedulerService: SkillSchedulerService,
  ) {
    this.configPath = join(process.cwd(), 'config', 'skills.yaml');
    this.loadConfig();
  }

  onModuleInit() {
    // Inject self into ExecutorTypesService for AgentHandler
    this.executorTypesService.setSkillsService(this);
    
    // Initialize scheduler with skills getter and start schedules
    this.skillSchedulerService.setSkillsGetter(() => this.getAllSkillDefinitions());
    this.skillSchedulerService.initializeSchedules();
  }

  private loadConfig() {
    try {
      if (existsSync(this.configPath)) {
        const content = readFileSync(this.configPath, 'utf8');
        this.config = yaml.load(content) as SkillConfig;
      } else {
        this.config = this.getDefaultConfig();
        this.saveConfig();
      }
    } catch (error) {
      this.logger.error('Failed to load skills config, using defaults', error);
      this.config = this.getDefaultConfig();
    }
  }

  private getDefaultConfig(): SkillConfig {
    return {
      smartFetch: {
        defaultPrompt: DEFAULT_PROMPT,
        autoGenerateNote: true,
        autoCreateCategory: true,
        notePath: 'WebClips',
        executors: {
          playwright: 'playwright-1',
          claudecode: 'claudecode-1',
        },
      },
    };
  }

  private saveConfig() {
    try {
      const yamlContent = yaml.dump(this.config);
      writeFileSync(this.configPath, yamlContent, 'utf8');
    } catch (error) {
      this.logger.error('Failed to save skills config', error);
    }
  }

  getConfig(): SkillConfig {
    return this.config;
  }

  reloadConfig(): void {
    this.loadConfig();
    this.logger.log('Skills config reloaded');
  }

  getSmartFetchConfig(): SmartFetchConfig {
    return this.config.smartFetch;
  }

  updateSmartFetchConfig(dto: UpdateSkillConfigDto): SmartFetchConfig {
    if (dto.defaultPrompt !== undefined) {
      this.config.smartFetch.defaultPrompt = dto.defaultPrompt;
    }
    if (dto.autoGenerateNote !== undefined) {
      this.config.smartFetch.autoGenerateNote = dto.autoGenerateNote;
    }
    if (dto.autoCreateCategory !== undefined) {
      this.config.smartFetch.autoCreateCategory = dto.autoCreateCategory;
    }
    if (dto.notePath !== undefined) {
      this.config.smartFetch.notePath = dto.notePath;
    }
    if (dto.executors) {
      if (dto.executors.playwright) {
        this.config.smartFetch.executors.playwright = dto.executors.playwright;
      }
      if (dto.executors.claudecode) {
        this.config.smartFetch.executors.claudecode = dto.executors.claudecode;
      }
    }
    this.saveConfig();
    return this.config.smartFetch;
  }

  async smartFetch(dto: SmartFetchDto): Promise<SmartFetchResult> {
    const { url } = dto;
    const playwrightExecutor = dto.playwrightExecutor || this.config.smartFetch.executors.playwright;
    const claudecodeExecutor = dto.claudecodeExecutor || this.config.smartFetch.executors.claudecode;
    const prompt = dto.prompt || this.config.smartFetch.defaultPrompt;
    const autoGenerateNote = dto.autoGenerateNote ?? this.config.smartFetch.autoGenerateNote;
    const autoCreateCategory = dto.autoCreateCategory ?? this.config.smartFetch.autoCreateCategory;
    const notePath = dto.notePath || this.config.smartFetch.notePath;

    this.logger.log(`Starting smart fetch for: ${url}`);

    // Step 1: Fetch web content using Playwright
    const fetchResult = await this.executorsService.invoke(playwrightExecutor, 'fetch', { url });

    if (!fetchResult.success) {
      return {
        success: false,
        url,
        error: `Failed to fetch content: ${fetchResult.error}`,
      };
    }

    const { title, textContent } = fetchResult.data;
    this.logger.log(`Fetched content from: ${url}, title: ${title}`);

    // Step 2: Generate note using Claude
    let finalPrompt = prompt
      .replace('{{title}}', title || 'Untitled')
      .replace('{{url}}', url)
      .replace('{{content}}', textContent || '');

    // If auto generate note is enabled, append save instruction
    let noteSavePath: string | undefined;
    if (autoGenerateNote) {
      let categoryInstruction = '';
      if (autoCreateCategory) {
        categoryInstruction = `
7. 根据内容主题自动创建分类目录，可以是多级分类（如：技术/前端、生活/旅行）
8. 最终保存路径格式：/vaults/${notePath}/[分类路径]/[文件名].md`;
      }

      finalPrompt += `

## 操作要求
请将生成的笔记保存为 Markdown 文件：
1. 文件名规则：使用你为笔记生成的一级标题（去除特殊字符后）作为文件名
2. 保存路径：/vaults/${notePath}/
3. 笔记正文内容不要包含一级标题（# 开头），因为文件名已经体现了标题
4. 在笔记末尾添加来源信息，格式：

---
来源: ${url}
5. 使用 UTF-8 编码保存
6. 保存成功后返回确认信息和完整文件路径${categoryInstruction}`;
      noteSavePath = `/vaults/${notePath}/`;
    }

    const chatResult = await this.executorsService.invoke(claudecodeExecutor, 'chat', {
      messages: [{ role: 'user', content: finalPrompt }],
      stream: false,
    });

    if (!chatResult.success) {
      return {
        success: false,
        url,
        title,
        originalContent: textContent,
        error: `Failed to generate note: ${chatResult.error}`,
      };
    }

    // Extract generated content from response
    let generatedNote = '';
    if (chatResult.data?.choices?.[0]?.message?.content) {
      generatedNote = chatResult.data.choices[0].message.content;
    } else if (chatResult.data?.content) {
      generatedNote = chatResult.data.content;
    } else if (typeof chatResult.data === 'string') {
      generatedNote = chatResult.data;
    }

    // Check if AI refused to process the content
    const refusalPatterns = [
      'respectfully decline',
      'cannot assist',
      'I apologize, but',
      "I'm not able to",
      'potential misuse',
      'I cannot help',
      'I cannot create',
      'I cannot generate',
      'concerns about',
      'labor rights',
      'I need to decline',
    ];

    const isRefusal = refusalPatterns.some((p) =>
      generatedNote.toLowerCase().includes(p.toLowerCase()),
    );

    if (isRefusal) {
      this.logger.warn(`AI refused to process content from: ${url}`);
      return {
        success: true,
        url,
        title,
        originalContent: textContent,
        generatedNote: undefined,
        noteSaved: false,
        warning: 'AI 拒绝处理此内容，已返回原始内容供您参考',
      };
    }

    // Check if note was saved (look for confirmation in response)
    const noteSaved = autoGenerateNote && generatedNote.length > 0 && 
      (generatedNote.includes('已保存') || generatedNote.includes('saved') || 
       generatedNote.includes('创建') || generatedNote.includes('写入') ||
       generatedNote.includes('Successfully'));

    return {
      success: true,
      url,
      title,
      originalContent: textContent,
      generatedNote,
      noteSaved: autoGenerateNote ? noteSaved : undefined,
      noteSavePath: autoGenerateNote ? noteSavePath : undefined,
    };
  }

  getAvailableSkills() {
    const builtinSkills = [
      {
        id: 'smart-fetch',
        name: 'Smart Fetch',
        description: 'Fetch web content and generate structured notes using AI',
        endpoint: '/api/skills/smart-fetch',
        builtin: true,
      },
    ];

    const customSkills = (this.config.skills || []).map((skill) => ({
      id: skill.id,
      name: skill.name,
      description: skill.description,
      endpoint: `/api/skills/${skill.id}/execute`,
      builtin: false,
      reserved: skill.reserved,
      enabled: skill.enabled,
      i18n: skill.i18n,
    }));

    return [...builtinSkills, ...customSkills];
  }

  // Custom Skills CRUD

  getAllSkillDefinitions(): SkillDefinition[] {
    return this.config.skills || [];
  }

  getSkillById(id: string): SkillDefinition | undefined {
    return (this.config.skills || []).find((s) => s.id === id);
  }

  createSkill(dto: CreateSkillDto): SkillDefinition {
    if (!this.config.skills) {
      this.config.skills = [];
    }

    // Use provided id if valid, otherwise generate from name
    let id = dto.id;
    if (!id || typeof id !== 'string' || id.trim() === '') {
      id = dto.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    }
    
    // If still no valid id (e.g., Chinese name), generate a random one
    if (!id || id.trim() === '') {
      id = `skill-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    }

    // Check for duplicate ID
    if (this.config.skills.some((s) => s.id === id)) {
      throw new BadRequestException(`Skill with ID "${id}" already exists`);
    }

    const skill: SkillDefinition = {
      id,
      name: dto.name,
      description: dto.description,
      icon: dto.icon,
      enabled: dto.enabled ?? true,
      builtin: false,
      builtinVariables: dto.builtinVariables || {},
      userInputs: dto.userInputs || [],
      steps: dto.steps || [],
      output: dto.output,
      schedule: dto.schedule,
    };

    this.config.skills.push(skill);
    this.saveConfig();

    // If schedule is enabled, register the scheduled task
    if (skill.enabled && skill.schedule?.enabled) {
      this.skillSchedulerService.scheduleSkill(skill);
    }

    this.logger.log(`Created skill: ${skill.id}`);
    return skill;
  }

  updateSkill(id: string, dto: UpdateSkillDto): SkillDefinition {
    const skills = this.config.skills || [];
    const index = skills.findIndex((s) => s.id === id);

    if (index === -1) {
      throw new NotFoundException(`Skill "${id}" not found`);
    }

    const skill = skills[index];

    if (dto.name !== undefined) skill.name = dto.name;
    if (dto.description !== undefined) skill.description = dto.description;
    if (dto.icon !== undefined) skill.icon = dto.icon;
    if (dto.enabled !== undefined) skill.enabled = dto.enabled;
    if (dto.builtinVariables !== undefined) skill.builtinVariables = dto.builtinVariables;
    if (dto.userInputs !== undefined) skill.userInputs = dto.userInputs;
    if (dto.steps !== undefined) skill.steps = dto.steps;
    if (dto.output !== undefined) skill.output = dto.output;
    if (dto.schedule !== undefined) skill.schedule = dto.schedule;

    this.saveConfig();

    // Update scheduler
    if (skill.enabled && skill.schedule?.enabled) {
      this.skillSchedulerService.scheduleSkill(skill);
    } else {
      this.skillSchedulerService.unscheduleSkill(id);
    }

    this.logger.log(`Updated skill: ${id}`);
    return skill;
  }

  deleteSkill(id: string): void {
    const skills = this.config.skills || [];
    const skill = skills.find((s) => s.id === id);

    if (!skill) {
      throw new NotFoundException(`Skill "${id}" not found`);
    }

    if (skill.reserved) {
      throw new BadRequestException(`技能 "${id}" 是保留技能，不可删除`);
    }

    // Remove scheduled task first
    this.skillSchedulerService.unscheduleSkill(id);

    const index = skills.indexOf(skill);
    skills.splice(index, 1);
    this.saveConfig();

    this.logger.log(`Deleted skill: ${id}`);
  }

  async executeSkill(
    id: string,
    userInputs: Record<string, any>,
  ): Promise<SkillExecutionResult> {
    const skill = this.getSkillById(id);

    if (!skill) {
      throw new NotFoundException(`Skill "${id}" not found`);
    }

    // 允许手动执行未启用的技能（便于测试）
    this.logger.log(`Executing skill: ${id}, enabled: ${skill.enabled}`);
    this.logger.log(`User inputs: ${JSON.stringify(userInputs)}`);

    return this.skillExecutorService.executeSkill(skill, userInputs);
  }

  getBuiltinVariables() {
    return this.skillExecutorService.getBuiltinVariables();
  }

  // Schedule Management

  getScheduleStatus(): ScheduleStatus[] {
    return this.skillSchedulerService.getScheduleStatus(this.getAllSkillDefinitions());
  }

  getExecutionHistory(skillId?: string, limit?: number): ExecutionRecord[] {
    return this.skillSchedulerService.getExecutionHistory(skillId, limit);
  }

  getSkillSchedule(id: string): SkillSchedule | null {
    const skill = this.getSkillById(id);
    if (!skill) {
      throw new NotFoundException(`Skill "${id}" not found`);
    }
    return skill.schedule || null;
  }

  updateSkillSchedule(id: string, dto: UpdateScheduleDto): SkillSchedule {
    const skills = this.config.skills || [];
    const skill = skills.find((s) => s.id === id);

    if (!skill) {
      throw new NotFoundException(`Skill "${id}" not found`);
    }

    const schedule: SkillSchedule = {
      enabled: dto.enabled,
      cron: dto.cron,
      interval: dto.interval,
      timezone: dto.timezone,
      retryOnFailure: dto.retryOnFailure,
      maxRetries: dto.maxRetries,
    };

    skill.schedule = schedule;
    this.saveConfig();

    // Update scheduler
    if (skill.enabled && schedule.enabled) {
      this.skillSchedulerService.scheduleSkill(skill);
    } else {
      this.skillSchedulerService.unscheduleSkill(id);
    }

    this.logger.log(`Updated schedule for skill: ${id}`);
    return schedule;
  }

  async triggerScheduledSkill(id: string): Promise<SkillExecutionResult> {
    const skill = this.getSkillById(id);

    if (!skill) {
      throw new NotFoundException(`Skill "${id}" not found`);
    }

    if (!skill.enabled) {
      throw new BadRequestException(`Skill "${id}" is disabled`);
    }

    return this.skillSchedulerService.triggerNow(skill);
  }

  reloadSchedules(): void {
    this.skillSchedulerService.clearAllSchedules();
    this.skillSchedulerService.initializeSchedules();
    this.logger.log('Schedules reloaded');
  }
}
