import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { ExecutorsService } from './executors.service';
import { CreateExecutorDto } from './dto/create-executor.dto';
import { UpdateExecutorDto } from './dto/update-executor.dto';

@Controller('api/executors')
export class ExecutorsController {
  constructor(private readonly executorsService: ExecutorsService) {}

  @Get()
  async findAll() {
    return this.executorsService.findAll();
  }

  @Get(':name')
  async findOne(@Param('name') name: string) {
    return this.executorsService.findOne(name);
  }

  @Post()
  async create(@Body() dto: CreateExecutorDto) {
    return this.executorsService.create(dto);
  }

  @Put(':name')
  async update(@Param('name') name: string, @Body() dto: UpdateExecutorDto) {
    return this.executorsService.update(name, dto);
  }

  @Delete(':name')
  async remove(@Param('name') name: string) {
    await this.executorsService.remove(name);
    return { success: true };
  }

  @Post(':name/check')
  async checkHealth(@Param('name') name: string) {
    return this.executorsService.checkHealth(name);
  }

  @Post(':name/toggle')
  async toggle(@Param('name') name: string) {
    return this.executorsService.toggle(name);
  }

  @Post('check-all')
  async checkAllHealth() {
    return this.executorsService.checkAllHealth();
  }
}
