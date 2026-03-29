import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import { AppConfigService } from '../../core/config/app-config.service';
import { AppLogger } from '../../core/logger/app-logger.service';
import { BASE_QUEUE_NAMES } from '../../core/queue/queue.constants';
import { QueueService } from '../../core/queue/queue.service';
import { getJobCorrelationId, QueueJobPayload } from '../base.worker';
import { SlackEventEnvelopeDto } from '../../integrations/slack/dto/slack-event-envelope.dto';
import { SlackService } from '../../integrations/slack/slack.service';

const MAX_RETRY_ATTEMPTS = 3;

interface SlackRetryJobPayload extends QueueJobPayload {
  envelope: SlackEventEnvelopeDto;
  retryAttempt?: number;
  lastError?: string;
  firstFailureAt?: string;
}

@Injectable()
export class SlackEventRetryWorker implements OnModuleInit, OnModuleDestroy {
  private worker: Worker<SlackRetryJobPayload> | null = null;

  constructor(
    private readonly appConfigService: AppConfigService,
    private readonly queueService: QueueService,
    private readonly slackService: SlackService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(SlackEventRetryWorker.name);
  }

  onModuleInit(): void {
    const redis = this.appConfigService.redis;

    this.worker = new Worker<SlackRetryJobPayload>(
      BASE_QUEUE_NAMES.SLACK_EVENT_RETRY,
      async (job: Job<SlackRetryJobPayload>) => this.processJob(job),
      {
        prefix: this.appConfigService.queue.prefix,
        connection: {
          host: redis.host,
          port: redis.port,
          password: redis.password || undefined,
          db: redis.db,
        },
        concurrency: 5,
      },
    );
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
    }
  }

  private async processJob(job: Job<SlackRetryJobPayload>): Promise<void> {
    const payload = job.data;
    const correlationId = getJobCorrelationId(payload);
    const eventId = payload.envelope?.event_id;

    this.logger.traceJobStart(
      job.name,
      BASE_QUEUE_NAMES.SLACK_EVENT_RETRY,
      String(job.id),
      correlationId,
    );

    try {
      await this.slackService.reprocessEvent(payload.envelope);

      this.logger.traceJobEnd(
        job.name,
        BASE_QUEUE_NAMES.SLACK_EVENT_RETRY,
        String(job.id),
        correlationId,
      );
    } catch (error: unknown) {
      const retryAttempt = (payload.retryAttempt ?? 0) + 1;
      const errorMessage = this.getErrorMessage(error);

      this.logger.traceJobFailure(
        job.name,
        BASE_QUEUE_NAMES.SLACK_EVENT_RETRY,
        String(job.id),
        errorMessage,
        correlationId,
      );

      if (retryAttempt < MAX_RETRY_ATTEMPTS) {
        const delayMs = this.appConfigService.queue.backoffMs * 2 ** (retryAttempt - 1);

        await this.queueService.addJob(
          BASE_QUEUE_NAMES.SLACK_EVENT_RETRY,
          job.name,
          {
            envelope: payload.envelope,
            retryAttempt,
            lastError: errorMessage,
            firstFailureAt: payload.firstFailureAt ?? new Date().toISOString(),
          },
          {
            attempts: 1,
            delay: delayMs,
            idempotencyKey: `retry:${eventId ?? String(job.id)}:${retryAttempt}`,
            correlationId,
          },
        );

        this.logger.warn('Slack retry attempt scheduled', {
          integration: 'slack',
          queueName: BASE_QUEUE_NAMES.SLACK_EVENT_RETRY,
          slackEventId: eventId,
          retryAttempt,
          maxRetryAttempts: MAX_RETRY_ATTEMPTS,
          delayMs,
          correlationId,
        });

        return;
      }

      await this.queueService.addJob(
        BASE_QUEUE_NAMES.DEAD_LETTER,
        'dead-letter-slack-attendance-event',
        {
          originalQueue: BASE_QUEUE_NAMES.SLACK_EVENT_RETRY,
          envelope: payload.envelope,
          retryAttempt,
          finalError: errorMessage,
          firstFailureAt: payload.firstFailureAt ?? new Date().toISOString(),
          deadLetteredAt: new Date().toISOString(),
        },
        {
          attempts: 1,
          idempotencyKey: `dead:${eventId ?? String(job.id)}`,
          correlationId,
        },
      );

      this.logger.error('Slack event moved to dead-letter queue after max retries', {
        integration: 'slack',
        originalQueue: BASE_QUEUE_NAMES.SLACK_EVENT_RETRY,
        deadLetterQueue: BASE_QUEUE_NAMES.DEAD_LETTER,
        slackEventId: eventId,
        retryAttempt,
        maxRetryAttempts: MAX_RETRY_ATTEMPTS,
        correlationId,
        error: errorMessage,
      });
    }
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown retry worker failure';
  }
}
