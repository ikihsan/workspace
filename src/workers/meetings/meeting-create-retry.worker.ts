import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import { AppConfigService } from '../../core/config/app-config.service';
import { AppLogger } from '../../core/logger/app-logger.service';
import { BASE_QUEUE_NAMES } from '../../core/queue/queue.constants';
import { QueueService } from '../../core/queue/queue.service';
import { getJobCorrelationId, QueueJobPayload } from '../base.worker';
import { MeetingsService } from '../../modules/meetings/meetings.service';

const MAX_RETRY_ATTEMPTS = 3;

interface MeetingRetryJobPayload extends QueueJobPayload {
  requestId: string;
  retryAttempt?: number;
  firstFailureAt?: string;
  lastError?: string;
}

@Injectable()
export class MeetingCreateRetryWorker implements OnModuleInit, OnModuleDestroy {
  private worker: Worker<MeetingRetryJobPayload> | null = null;

  constructor(
    private readonly appConfigService: AppConfigService,
    private readonly queueService: QueueService,
    private readonly meetingsService: MeetingsService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(MeetingCreateRetryWorker.name);
  }

  onModuleInit(): void {
    const redis = this.appConfigService.redis;

    this.worker = new Worker<MeetingRetryJobPayload>(
      BASE_QUEUE_NAMES.MEETING_CREATE_RETRY,
      async (job: Job<MeetingRetryJobPayload>) => this.process(job),
      {
        prefix: this.appConfigService.queue.prefix,
        connection: {
          host: redis.host,
          port: redis.port,
          password: redis.password || undefined,
          db: redis.db,
        },
        concurrency: 3,
      },
    );
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
    }
  }

  private async process(job: Job<MeetingRetryJobPayload>): Promise<void> {
    const payload = job.data;
    const correlationId = getJobCorrelationId(payload);

    this.logger.traceJobStart(
      job.name,
      BASE_QUEUE_NAMES.MEETING_CREATE_RETRY,
      String(job.id),
      correlationId,
    );

    try {
      await this.meetingsService.executeCreateForRequest(payload.requestId);

      this.logger.traceJobEnd(
        job.name,
        BASE_QUEUE_NAMES.MEETING_CREATE_RETRY,
        String(job.id),
        correlationId,
      );
    } catch (error: unknown) {
      const retryAttempt = (payload.retryAttempt ?? 0) + 1;
      const errorMessage = this.getErrorMessage(error);

      this.logger.traceJobFailure(
        job.name,
        BASE_QUEUE_NAMES.MEETING_CREATE_RETRY,
        String(job.id),
        errorMessage,
        correlationId,
      );

      if (retryAttempt < MAX_RETRY_ATTEMPTS) {
        const delayMs = this.appConfigService.queue.backoffMs * 2 ** (retryAttempt - 1);

        await this.queueService.addJob(
          BASE_QUEUE_NAMES.MEETING_CREATE_RETRY,
          job.name,
          {
            requestId: payload.requestId,
            retryAttempt,
            firstFailureAt: payload.firstFailureAt ?? new Date().toISOString(),
            lastError: errorMessage,
          },
          {
            attempts: 1,
            delay: delayMs,
            idempotencyKey: `meeting-create:${payload.requestId}:${retryAttempt}`,
            correlationId,
          },
        );

        this.logger.warn('Meeting creation retry scheduled', {
          module: 'meetings',
          requestId: payload.requestId,
          retryAttempt,
          maxRetryAttempts: MAX_RETRY_ATTEMPTS,
          delayMs,
          correlationId,
        });

        return;
      }

      await this.meetingsService.markRequestFailed(payload.requestId, errorMessage);

      await this.queueService.addJob(
        BASE_QUEUE_NAMES.DEAD_LETTER,
        'dead-letter-meeting-create',
        {
          requestId: payload.requestId,
          firstFailureAt: payload.firstFailureAt ?? new Date().toISOString(),
          deadLetteredAt: new Date().toISOString(),
          error: errorMessage,
        },
        {
          attempts: 1,
          idempotencyKey: `meeting-dead:${payload.requestId}`,
          correlationId,
        },
      );

      this.logger.error('Meeting creation moved to dead-letter queue', {
        module: 'meetings',
        requestId: payload.requestId,
        retryAttempt,
        maxRetryAttempts: MAX_RETRY_ATTEMPTS,
        deadLetterQueue: BASE_QUEUE_NAMES.DEAD_LETTER,
        correlationId,
        error: errorMessage,
      });
    }
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown meeting retry error';
  }
}
