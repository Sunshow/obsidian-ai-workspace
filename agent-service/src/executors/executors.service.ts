import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import { writeFileSync } from 'fs';
import { join } from 'path';
import * as yaml from 'js-yaml';
import { Executor } from './interfaces/executor.interface';
import { CreateExecutorDto } from './dto/create-executor.dto';
import { UpdateExecutorDto } from './dto/update-executor.dto';
import { ExecutorConfig } from '../config/configuration';

@Injectable()
export class ExecutorsService {
  private readonly logger = new Logger(ExecutorsService.name);
  private executors: Map<string, Executor> = new Map();
  private readonly healthCheckInterval: number;

  constructor(private configService: ConfigService) {
    this.loadFromConfig();
    this.healthCheckInterval = parseInt(
      process.env.HEALTH_CHECK_INTERVAL || '30000',
      10,
    );
  }

  private loadFromConfig() {
    const configs = this.configService.get<ExecutorConfig[]>('executors') || [];
    for (const config of configs) {
      this.executors.set(config.name, {
        ...config,
        status: 'unknown',
      });
    }
  }

  private saveToConfig() {
    const configPath = join(process.cwd(), 'config', 'executors.yaml');
    const executorsList = Array.from(this.executors.values()).map(
      ({ name, type, endpoint, healthPath, enabled, description }) => ({
        name,
        type,
        endpoint,
        healthPath,
        enabled,
        description,
      }),
    );
    const yamlContent = yaml.dump({ executors: executorsList });
    writeFileSync(configPath, yamlContent, 'utf8');
  }

  async findAll(): Promise<Executor[]> {
    return Array.from(this.executors.values());
  }

  async findOne(name: string): Promise<Executor> {
    const executor = this.executors.get(name);
    if (!executor) {
      throw new NotFoundException(`Executor ${name} not found`);
    }
    return executor;
  }

  async create(dto: CreateExecutorDto): Promise<Executor> {
    if (this.executors.has(dto.name)) {
      throw new ConflictException(`Executor ${dto.name} already exists`);
    }

    const executor: Executor = {
      name: dto.name,
      type: dto.type,
      endpoint: dto.endpoint,
      healthPath: dto.healthPath || '/health',
      enabled: dto.enabled ?? true,
      description: dto.description,
      status: 'unknown',
    };

    this.executors.set(dto.name, executor);
    this.saveToConfig();
    return executor;
  }

  async update(name: string, dto: UpdateExecutorDto): Promise<Executor> {
    const executor = await this.findOne(name);

    const updated: Executor = {
      ...executor,
      ...dto,
      name: executor.name, // name cannot be changed
    };

    this.executors.set(name, updated);
    this.saveToConfig();
    return updated;
  }

  async remove(name: string): Promise<void> {
    if (!this.executors.has(name)) {
      throw new NotFoundException(`Executor ${name} not found`);
    }
    this.executors.delete(name);
    this.saveToConfig();
  }

  async toggle(name: string): Promise<Executor> {
    const executor = await this.findOne(name);
    executor.enabled = !executor.enabled;
    this.executors.set(name, executor);
    this.saveToConfig();
    return executor;
  }

  async checkHealth(name: string): Promise<Executor> {
    const executor = await this.findOne(name);

    if (!executor.enabled) {
      executor.status = 'unknown';
      executor.lastChecked = new Date();
      return executor;
    }

    const startTime = Date.now();
    try {
      const url = `${executor.endpoint}${executor.healthPath}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      executor.responseTime = Date.now() - startTime;
      executor.status = response.ok ? 'healthy' : 'unhealthy';
    } catch {
      executor.responseTime = Date.now() - startTime;
      executor.status = 'unhealthy';
    }

    executor.lastChecked = new Date();
    this.executors.set(name, executor);
    return executor;
  }

  async checkAllHealth(): Promise<Executor[]> {
    const names = Array.from(this.executors.keys());
    await Promise.all(names.map((name) => this.checkHealth(name)));
    return this.findAll();
  }

  @Interval(30000)
  async handleScheduledHealthCheck() {
    if (this.executors.size === 0) return;
    this.logger.log('Running scheduled health check for all executors');
    await this.checkAllHealth();
  }
}
