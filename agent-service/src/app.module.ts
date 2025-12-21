import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ScheduleModule } from '@nestjs/schedule';
import { join } from 'path';
import { AppConfigModule } from './config/config.module';
import { ExecutorTypesModule } from './executor-types/executor-types.module';
import { ExecutorsModule } from './executors/executors.module';
import { SkillsModule } from './skills/skills.module';
import { HealthController } from './health/health.controller';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      exclude: ['/api*', '/health*'],
    }),
    AppConfigModule,
    ExecutorTypesModule,
    ExecutorsModule,
    SkillsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
