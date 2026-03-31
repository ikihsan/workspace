import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { JobsOptions, Queue } from 'bullmq';
import { AppConfigService } from '../config/app-config.service';
import { RequestContext } from '../correlation/request-context';
import { AppLogger } from '../logger/app-logger.service';
import {
  DEFAULT_JOB_REMOVE_ON_COMPLETE,
  DEFAULT_JOB_REMOVE_ON_FAIL,
} from './queue.constants';

export interface EnqueueOptions extends JobsOptions {
  correlationId?: string;
  idempotencyKey?: string;
}

interface JobTrace {
  correlationId?: string;
}

type QueuePayload = Record<string, unknown> & {
  trace?: JobTrace;
};

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly queues = new Map<string, Queue>();

  constructor(
    private readonly configService: AppConfigService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(QueueService.name);
  }

  async addJob<TPayload extends Record<string, unknown>>(
    queueName: string,
    jobName: string,
    payload: TPayload,
    options?: EnqueueOptions,
  ): Promise<string> {
    const correlationId = options?.correlationId ?? RequestContext.getCorrelationId();
    const tracePayload: QueuePayload = {
      ...payload,
      trace: {
        correlationId,
      },
    };

    const queue = this.getQueue(queueName);
    const job = await queue.add(jobName, tracePayload, {
      attempts: this.configService.queue.defaultAttempts,
      backoff: {
        type: 'exponential',
        delay: this.configService.queue.backoffMs,
      },
      removeOnComplete: DEFAULT_JOB_REMOVE_ON_COMPLETE,
      removeOnFail: DEFAULT_JOB_REMOVE_ON_FAIL,
      jobId: options?.idempotencyKey,
      ...options,
    });

    this.logger.info('Queue job enqueued', {
      module: 'queue',
      queueName,
      jobName,
      jobId: String(job.id),
      correlationId,
      idempotencyKey: options?.idempotencyKey,
      attempts: options?.attempts ?? this.configService.queue.defaultAttempts,
    });

    return String(job.id);
  }

  getQueue(queueName: string): Queue {
    const existing = this.queues.get(queueName);
    if (existing) {
      return existing;
    }

    const redis = this.configService.redis;
    const queue = new Queue(queueName, {
      prefix: this.configService.queue.prefix,
      connection: {
        host: redis.host,
        port: redis.port,
        password: redis.password || undefined,
        db: redis.db,
      },
    });

    this.logger.info('Queue instance created', {
      module: 'queue',
      queueName,
      prefix: this.configService.queue.prefix,
      redisHost: redis.host,
      redisPort: redis.port,
      redisDb: redis.db,
    });

    this.queues.set(queueName, queue);
    return queue;
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all(Array.from(this.queues.values()).map((queue) => queue.close()));
  }
}
