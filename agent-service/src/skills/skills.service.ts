import { Injectable, Logger } from '@nestjs/common';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import * as yaml from 'js-yaml';
import { ExecutorsService } from '../executors/executors.service';
import { SkillConfig, SmartFetchConfig, SmartFetchResult } from './interfaces/skill.interface';
import { SmartFetchDto, UpdateSkillConfigDto } from './dto/smart-fetch.dto';

const DEFAULT_PROMPT = `请根据以下网页内容生成一份结构化的 Markdown 笔记。要求：
1. 提取关键信息和要点
2. 使用清晰的标题层级
3. 保留重要的数据和观点
4. 添加适当的总结

网页标题: {{title}}
网页内容:
{{content}}`;

@Injectable()
export class SkillsService {
  private readonly logger = new Logger(SkillsService.name);
  private config: SkillConfig;
  private readonly configPath: string;

  constructor(private readonly executorsService: ExecutorsService) {
    this.configPath = join(process.cwd(), 'config', 'skills.yaml');
    this.loadConfig();
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

  getSmartFetchConfig(): SmartFetchConfig {
    return this.config.smartFetch;
  }

  updateSmartFetchConfig(dto: UpdateSkillConfigDto): SmartFetchConfig {
    if (dto.defaultPrompt !== undefined) {
      this.config.smartFetch.defaultPrompt = dto.defaultPrompt;
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
    const finalPrompt = prompt
      .replace('{{title}}', title || 'Untitled')
      .replace('{{content}}', textContent || '');

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

    return {
      success: true,
      url,
      title,
      originalContent: textContent,
      generatedNote,
    };
  }

  getAvailableSkills() {
    return [
      {
        id: 'smart-fetch',
        name: 'Smart Fetch',
        description: 'Fetch web content and generate structured notes using AI',
        endpoint: '/api/skills/smart-fetch',
      },
    ];
  }
}
