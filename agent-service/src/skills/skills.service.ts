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
