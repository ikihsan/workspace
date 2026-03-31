import { Injectable } from '@nestjs/common';
import { AttendanceEventSource } from '@prisma/client';
import { AppLogger } from '../../core/logger/app-logger.service';
import { BASE_QUEUE_NAMES } from '../../core/queue/queue.constants';
import { QueueService } from '../../core/queue/queue.service';
import { AttendanceService } from '../../modules/attendance/attendance.service';
import { GoogleSheetsWriteService } from '../google-sheets/google-sheets-write.service';
import { SlackEventEnvelopeDto } from './dto/slack-event-envelope.dto';
import { SlackIdentityResolver } from './slack-identity.resolver';
import { SlackMessageParser } from './slack-message.parser';
import { SlackTimeResolver } from './slack-time.resolver';

interface SlackEventResponse {
  ok: boolean;
  queued: boolean;
  ignored: boolean;
  reason?: string;
}

interface ProcessingOptions {
  allowQueueFallback: boolean;
}

@Injectable()
export class SlackService {
  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly messageParser: SlackMessageParser,
    private readonly timeResolver: SlackTimeResolver,
    private readonly identityResolver: SlackIdentityResolver,
    private readonly sheetsWriteService: GoogleSheetsWriteService,
    private readonly queueService: QueueService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(SlackService.name);
  }

  async handleEvent(envelope: SlackEventEnvelopeDto): Promise<SlackEventResponse> {
    return this.processEnvelope(envelope, {
      allowQueueFallback: true,
    });
  }

  async reprocessEvent(envelope: SlackEventEnvelopeDto): Promise<SlackEventResponse> {
    return this.processEnvelope(envelope, {
      allowQueueFallback: false,
    });
  }

  private async processEnvelope(
    envelope: SlackEventEnvelopeDto,
    options: ProcessingOptions,
  ): Promise<SlackEventResponse> {
    this.logger.info('Slack event received', {
      integration: 'slack',
      slackEventId: envelope.event_id,
      slackEnvelopeType: envelope.type,
      slackInnerType: envelope.event?.type,
      fromRetryWorker: !options.allowQueueFallback,
    });

    if (envelope.type !== 'event_callback') {
      return {
        ok: true,
        queued: false,
        ignored: true,
        reason: 'Unsupported Slack envelope type',
      };
    }

    if (!envelope.event_id || !envelope.event) {
      return {
        ok: true,
        queued: false,
        ignored: true,
        reason: 'Missing Slack event id or inner event payload',
      };
    }

    if (envelope.event.type !== 'message') {
      return {
        ok: true,
        queued: false,
        ignored: true,
        reason: 'Unsupported Slack event type',
      };
    }

    if (envelope.event.subtype || envelope.event.bot_id) {
      return {
        ok: true,
        queued: false,
        ignored: true,
        reason: 'Ignoring bot or subtype messages',
      };
    }

    const slackUserId = envelope.event.user?.trim();
    const text = envelope.event.text?.trim();

    this.logger.info('Slack message payload extracted', {
      integration: 'slack',
      slackEventId: envelope.event_id,
      slackUserId,
      text,
      textLength: text?.length,
    });

    if (!slackUserId || !text) {
      return {
        ok: true,
        queued: false,
        ignored: true,
        reason: 'Missing Slack user or text content',
      };
    }

    const parsed = this.messageParser.parse(text);
    if (!parsed) {
      this.logger.info('Slack message ignored: no attendance intent detected', {
        integration: 'slack',
        slackEventId: envelope.event_id,
        text,
      });

      return {
        ok: true,
        queued: false,
        ignored: true,
        reason: 'No attendance intent detected',
      };
    }

    try {
      const user = await this.identityResolver.resolveOrCreate(slackUserId);

      const eventTimestamp = this.timeResolver.resolve(
        parsed.extractedTime,
        envelope.event.event_ts,
        user.timezone,
      );

      this.logger.info('Dispatching Slack attendance event', {
        integration: 'slack',
        slackEventId: envelope.event_id,
        slackUserId,
        mappedEventType: parsed.intent,
        resolvedTime: eventTimestamp,
        timeSource: parsed.extractedTime ? 'user-provided' : 'slack-event-ts',
      });

      const result = await this.attendanceService.processEvent({
        eventType: parsed.intent,
        source: 'SLACK' as AttendanceEventSource,
        idempotencyKey: envelope.event_id,
        userId: user.id,
        eventTimestamp,
      });

      if (!result.duplicate) {
        this.scheduleSheetLog({
          eventId: envelope.event_id,
          date: result.workDate,
          userName: user.name,
          slackUserId,
          actionType: parsed.intent,
          resolvedTime: result.eventTimestamp,
          originalMessage: text,
          slackTimestamp: envelope.event.event_ts ?? '',
          channel: envelope.event.channel ?? '',
        });
      }

      return {
        ok: true,
        queued: false,
        ignored: false,
      };
    } catch (error: unknown) {
      if (!options.allowQueueFallback) {
        throw error;
      }

      try {
        const queueJobId = await this.queueService.addJob(
          BASE_QUEUE_NAMES.SLACK_EVENT_RETRY,
          'retry-slack-attendance-event',
          {
            envelope,
            retryAttempt: 0,
            lastError: this.getErrorMessage(error),
            firstFailureAt: new Date().toISOString(),
          },
          {
            idempotencyKey: `retry:${envelope.event_id}`,
            attempts: 1,
          },
        );

        this.logger.error('Slack event processing failed; queued for retry', {
          integration: 'slack',
          slackEventId: envelope.event_id,
          queueJobId,
          error: this.getErrorMessage(error),
        });

        return {
          ok: true,
          queued: true,
          ignored: false,
          reason: 'Queued for retry after processing failure',
        };
      } catch (queueError: unknown) {
        this.logger.error('Slack event processing failed and queue fallback also failed', {
          integration: 'slack',
          slackEventId: envelope.event_id,
          processingError: this.getErrorMessage(error),
          queueError: this.getErrorMessage(queueError),
        });

        return {
          ok: false,
          queued: false,
          ignored: false,
          reason: 'Processing failed and queue fallback failed',
        };
      }
    }
  }

  private scheduleSheetLog(entry: {
    eventId: string;
    date: string;
    userName: string;
    slackUserId: string;
    actionType: string;
    resolvedTime: string;
    originalMessage: string;
    slackTimestamp: string;
    channel: string;
  }): void {
    if (!this.sheetsWriteService.isConfigured()) {
      return;
    }

    this.sheetsWriteService.logAttendanceEvent(entry).catch((error: unknown) => {
      this.logger.warn('Sheets direct write failed; queuing for retry', {
        integration: 'google-sheets',
        eventId: entry.eventId,
        error: error instanceof Error ? error.message : 'Unknown Sheets write error',
      });

      this.queueService
        .addJob(
          BASE_QUEUE_NAMES.ATTENDANCE_SHEETS_LOG,
          'attendance-sheets-log',
          {
            entry,
            retryAttempt: 0,
            firstFailureAt: new Date().toISOString(),
          },
          {
            idempotencyKey: `sheets-log:${entry.eventId}:0`,
            attempts: 1,
          },
        )
        .catch((queueError: unknown) => {
          this.logger.error('Failed to queue Sheets log retry', {
            integration: 'google-sheets',
            eventId: entry.eventId,
            error: queueError instanceof Error ? queueError.message : 'Unknown queue error',
          });
        });
    });
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown Slack processing failure';
  }
}
