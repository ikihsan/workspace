import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { RedisClientType, createClient } from 'redis';
import { AppConfigService } from '../config/app-config.service';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: RedisClientType;
  private readonly isConnected: Promise<RedisClientType>;

  constructor(configService: AppConfigService) {
    const config = configService.redis;
    const encodedPassword = config.password ? encodeURIComponent(config.password) : '';
    const auth = encodedPassword ? `:${encodedPassword}@` : '';

    this.client = createClient({
      url: `redis://${auth}${config.host}:${config.port}/${config.db}`,
    });

    this.isConnected = this.client.connect();
  }

  getClient(): RedisClientType {
    return this.client;
  }

  async ping(): Promise<string> {
    await this.isConnected;
    return this.client.ping();
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }
}
