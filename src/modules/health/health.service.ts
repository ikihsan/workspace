import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { RedisService } from '../../core/redis/redis.service';

interface DependencyHealth {
  status: 'up' | 'down';
  latencyMs?: number;
  message?: string;
}

export interface HealthResponse {
  status: 'ok' | 'degraded';
  uptimeSeconds: number;
  timestamp: string;
  checks: {
    postgres: DependencyHealth;
    redis: DependencyHealth;
  };
}

@Injectable()
export class HealthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async getHealth(): Promise<HealthResponse> {
    const [postgres, redis] = await Promise.all([this.checkPostgres(), this.checkRedis()]);

    const status = postgres.status === 'up' && redis.status === 'up' ? 'ok' : 'degraded';

    return {
      status,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      checks: {
        postgres,
        redis,
      },
    };
  }

  private async checkPostgres(): Promise<DependencyHealth> {
    const startedAt = Date.now();

    try {
      await this.prismaService.$queryRaw`SELECT 1`;

      return {
        status: 'up',
        latencyMs: Date.now() - startedAt,
      };
    } catch {
      return {
        status: 'down',
        latencyMs: Date.now() - startedAt,
        message: 'PostgreSQL readiness check failed',
      };
    }
  }

  private async checkRedis(): Promise<DependencyHealth> {
    const startedAt = Date.now();

    try {
      const result = await this.redisService.ping();

      if (result !== 'PONG') {
        return {
          status: 'down',
          latencyMs: Date.now() - startedAt,
          message: 'Redis ping returned unexpected response',
        };
      }

      return {
        status: 'up',
        latencyMs: Date.now() - startedAt,
      };
    } catch {
      return {
        status: 'down',
        latencyMs: Date.now() - startedAt,
        message: 'Redis readiness check failed',
      };
    }
  }
}
