import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  appConfig,
  databaseConfig,
  googleSheetsConfig,
  queueConfig,
  redisConfig,
  schedulerConfig,
  slackConfig,
  validateEnv,
} from './index';
import { AppConfigService } from './app-config.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      load: [
        appConfig,
        databaseConfig,
        redisConfig,
        queueConfig,
        slackConfig,
        googleSheetsConfig,
        schedulerConfig,
      ],
      validate: validateEnv,
    }),
  ],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class CoreConfigModule {}
