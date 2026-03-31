import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import { AppConfigService } from '../../core/config/app-config.service';
import { AppLogger } from '../../core/logger/app-logger.service';
import { BASE_QUEUE_NAMES } from '../../core/queue/queue.constants';
import { QueueService } from '../../core/queue/queue.service';
import {
  AttendanceLogEntry,
  GoogleSheetsWriteService,
} from '../../integrations/google-sheets/google-sheets-write.service';
import { getJobCorrelationId } from '../base.worker';

const MAX_RETRY_ATTEMPTS = 3;

interface SheetsLogJobPayload {
  entry: AttendanceLogEntry;
  retryAttempt: number;
  lastError?: string;
  firstFailureAt: string;
  trace?: { correlationId?: string };
  [key: string]: unknown;
}

@Injectable()
export class AttendanceSheetsLogWorker implements OnModuleInit, OnModuleDestroy {
  private worker!: Worker;

  constructor(
    private readonly sheetsWriteService: GoogleSheetsWriteService,
    private readonly queueService: QueueService,
    private readonly configService: AppConfigService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(AttendanceSheetsLogWorker.name);
  }

  onModuleInit(): void {
    const redis = this.configService.redis;

    this.worker = new Worker(
      BASE_QUEUE_NAMES.ATTENDANCE_SHEETS_LOG,
      async (job: Job<SheetsLogJobPayload>) => this.process(job),
      {
        connection: {
          host: redis.host,
          port: redis.port,
          password: redis.password || undefined,
          db: redis.db,
        },
        prefix: this.configService.queue.prefix,
        concurrency: 3,
      },
    );

    this.logger.info('Attendance Sheets log worker started', {
      module: 'worker',
      queue: BASE_QUEUE_NAMES.ATTENDANCE_SHEETS_LOG,
    });
  }

  private async process(job: Job<SheetsLogJobPayload>): Promise<void> {
    const { entry, retryAttempt } = job.data;
    const correlationId = getJobCorrelationId(job.data);

    this.logger.traceJobStart(
      'attendance-sheets-log',
      BASE_QUEUE_NAMES.ATTENDANCE_SHEETS_LOG,
      String(job.id),
      correlationId,
    );

    try {
      await this.sheetsWriteService.logAttendanceEvent(entry);

      this.logger.traceJobEnd(
        'attendance-sheets-log',
        BASE_QUEUE_NAMES.ATTENDANCE_SHEETS_LOG,
        String(job.id),
        correlationId,
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown Sheets write error';

      this.logger.traceJobFailure(
        'attendance-sheets-log',
        BASE_QUEUE_NAMES.ATTENDANCE_SHEETS_LOG,
        String(job.id),
        errorMessage,
        correlationId,
      );

      if (retryAttempt < MAX_RETRY_ATTEMPTS) {
        const nextAttempt = retryAttempt + 1;
        const delayMs = this.configService.queue.backoffMs * 2 ** retryAttempt;

        await this.queueService.addJob(
          BASE_QUEUE_NAMES.ATTENDANCE_SHEETS_LOG,
          'attendance-sheets-log-retry',
          {
            entry,
            retryAttempt: nextAttempt,
            lastError: errorMessage,
            firstFailureAt: job.data.firstFailureAt,
          },
          {
            idempotencyKey: `sheets-log:${entry.eventId}:${nextAttempt}`,
            attempts: 1,
            delay: delayMs,
          },
        );

        this.logger.warn('Sheets log retry scheduled', {
          module: 'worker',
          eventId: entry.eventId,
          retryAttempt: nextAttempt,
          delayMs,
        });
      } else {
        await this.queueService.addJob(
          BASE_QUEUE_NAMES.DEAD_LETTER,
          'dead-letter-attendance-sheets-log',
          {
            originalQueue: BASE_QUEUE_NAMES.ATTENDANCE_SHEETS_LOG,
            entry,
            retryAttempt,
            finalError: errorMessage,
            firstFailureAt: job.data.firstFailureAt,
            deadLetteredAt: new Date().toISOString(),
          },
          {
            idempotencyKey: `dead:sheets-log:${entry.eventId}`,
            attempts: 1,
          },
        );

        this.logger.error('Sheets log moved to dead-letter queue', {
          module: 'worker',
          eventId: entry.eventId,
          retryAttempt,
          finalError: errorMessage,
        });
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
  }
}
