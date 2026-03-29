import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from './app.config';
import { DatabaseConfig } from './database.config';
import { GoogleSheetsConfig } from './google-sheets.config';
import { MicrosoftGraphConfig } from './microsoft-graph.config';
import { QueueConfig } from './queue.config';
import { RedisConfig } from './redis.config';
import { SchedulerConfig } from './scheduler.config';
import { SlackConfig } from './slack.config';

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService) {}

  get app(): AppConfig {
    return this.configService.getOrThrow<AppConfig>('app');
  }

  get database(): DatabaseConfig {
    return this.configService.getOrThrow<DatabaseConfig>('database');
  }

  get redis(): RedisConfig {
    return this.configService.getOrThrow<RedisConfig>('redis');
  }

  get queue(): QueueConfig {
    return this.configService.getOrThrow<QueueConfig>('queue');
  }

  get slack(): SlackConfig {
    return this.configService.getOrThrow<SlackConfig>('slack');
  }

  get googleSheets(): GoogleSheetsConfig {
    return this.configService.getOrThrow<GoogleSheetsConfig>('googleSheets');
  }

  get scheduler(): SchedulerConfig {
    return this.configService.getOrThrow<SchedulerConfig>('scheduler');
  }

  get microsoftGraph(): MicrosoftGraphConfig {
    return this.configService.getOrThrow<MicrosoftGraphConfig>('microsoftGraph');
  }

  get port(): number {
    return this.app.port;
  }

  get corsOrigin(): string {
    return this.app.corsOrigin;
  }

  get logLevel(): AppConfig['logLevel'] {
    return this.app.logLevel;
  }
}
