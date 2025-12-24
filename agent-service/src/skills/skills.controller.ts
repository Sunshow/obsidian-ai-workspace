import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { SkillsService } from './skills.service';
import { SmartFetchDto, UpdateSkillConfigDto } from './dto/smart-fetch.dto';
import { CreateSkillDto, UpdateSkillDto } from './dto/create-skill.dto';
import { ExecuteSkillDto } from './dto/execute-skill.dto';
import { UpdateScheduleDto } from './dto/schedule.dto';

@Controller('api/skills')
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Get()
  getAvailableSkills() {
    return this.skillsService.getAvailableSkills();
  }

  @Post('reload')
  reloadConfig() {
    this.skillsService.reloadConfig();
    return { success: true, message: 'Skills config reloaded' };
  }

  @Get('builtin-variables')
  getBuiltinVariables() {
    return this.skillsService.getBuiltinVariables();
  }

  @Get('definitions')
  getAllSkillDefinitions() {
    return this.skillsService.getAllSkillDefinitions();
  }

  @Get('definitions/:id')
  getSkillDefinition(@Param('id') id: string) {
    return this.skillsService.getSkillById(id);
  }

  @Post('definitions')
  createSkill(@Body() dto: CreateSkillDto) {
    return this.skillsService.createSkill(dto);
  }

  @Put('definitions/:id')
  updateSkill(@Param('id') id: string, @Body() dto: UpdateSkillDto) {
    return this.skillsService.updateSkill(id, dto);
  }

  @Delete('definitions/:id')
  deleteSkill(@Param('id') id: string) {
    return this.skillsService.deleteSkill(id);
  }

  @Post(':id/execute')
  async executeSkill(
    @Param('id') id: string,
    @Body() dto: ExecuteSkillDto,
  ) {
    return this.skillsService.executeSkill(id, dto.userInputs || {});
  }

  @Get('config')
  getConfig() {
    return this.skillsService.getConfig();
  }

  @Get('config/smart-fetch')
  getSmartFetchConfig() {
    return this.skillsService.getSmartFetchConfig();
  }

  @Put('config/smart-fetch')
  updateSmartFetchConfig(@Body() dto: UpdateSkillConfigDto) {
    return this.skillsService.updateSmartFetchConfig(dto);
  }

  @Post('smart-fetch')
  async smartFetch(@Body() dto: SmartFetchDto) {
    return this.skillsService.smartFetch(dto);
  }

  // Schedule APIs
  @Get('schedules')
  getScheduleStatus() {
    return this.skillsService.getScheduleStatus();
  }

  @Get('schedules/history')
  getExecutionHistory(
    @Query('skillId') skillId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.skillsService.getExecutionHistory(skillId, limit ? parseInt(limit, 10) : undefined);
  }

  @Get('task-queue/status')
  getTaskQueueStatus() {
    return this.skillsService.getTaskQueueStatus();
  }

  @Get(':id/schedule')
  getSkillSchedule(@Param('id') id: string) {
    return this.skillsService.getSkillSchedule(id);
  }

  @Put(':id/schedule')
  updateSkillSchedule(@Param('id') id: string, @Body() dto: UpdateScheduleDto) {
    return this.skillsService.updateSkillSchedule(id, dto);
  }

  @Post(':id/schedule/trigger')
  async triggerScheduledSkill(@Param('id') id: string) {
    return this.skillsService.triggerScheduledSkill(id);
  }
}
