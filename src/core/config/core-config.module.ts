import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  azureOpenAiConfig,
  appConfig,
  databaseConfig,
  googleSheetsConfig,
  queueConfig,
  redisConfig,
  schedulerConfig,
  slackConfig,
  validateEnv,
} from './index';
import microsoftGraphConfig from './microsoft-graph.config';
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
        microsoftGraphConfig,
        azureOpenAiConfig,
      ],
      validate: validateEnv,
    }),
  ],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class CoreConfigModule {}
