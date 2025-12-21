import { Controller, Get, Post, Put, Body } from '@nestjs/common';
import { SkillsService } from './skills.service';
import { SmartFetchDto, UpdateSkillConfigDto } from './dto/smart-fetch.dto';

@Controller('api/skills')
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Get()
  getAvailableSkills() {
    return this.skillsService.getAvailableSkills();
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
}
