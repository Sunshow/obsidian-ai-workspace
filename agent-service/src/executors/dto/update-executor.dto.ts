import { PartialType } from '@nestjs/mapped-types';
import { CreateExecutorDto } from './create-executor.dto';

export class UpdateExecutorDto extends PartialType(CreateExecutorDto) {}
