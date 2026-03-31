import { Injectable } from '@nestjs/common';
import {
  AttendanceEventSource,
  IdentityProvider,
} from '@prisma/client';
import { AppLogger } from '../../core/logger/app-logger.service';
import { BASE_QUEUE_NAMES } from '../../core/queue/queue.constants';
import { QueueService } from '../../core/queue/queue.service';
import { AttendanceService } from '../../modules/attendance/attendance.service';
import { SlackCommandParser } from './slack-command.parser';
import { SlackEventEnvelopeDto } from './dto/slack-event-envelope.dto';

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
    private readonly commandParser: SlackCommandParser,
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

    const eventType = this.commandParser.parse(text);
    if (!eventType) {
      this.logger.info('Slack message ignored because command is unsupported', {
        integration: 'slack',
        slackEventId: envelope.event_id,
        text,
      });

      return {
        ok: true,
        queued: false,
        ignored: true,
        reason: 'Unsupported deterministic command',
      };
    }

    try {
      this.logger.info('Dispatching Slack attendance event', {
        integration: 'slack',
        slackEventId: envelope.event_id,
        slackUserId,
        mappedEventType: eventType,
      });

      await this.attendanceService.processEvent({
        eventType,
        source: 'SLACK' as AttendanceEventSource,
        idempotencyKey: envelope.event_id,
        provider: IdentityProvider.SLACK,
        providerUserId: slackUserId,
        eventTimestamp: this.toIsoTimestamp(envelope.event.event_ts),
      });

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

  private toIsoTimestamp(slackEventTs: string | undefined): string | undefined {
    if (!slackEventTs) {
      return undefined;
    }

    const seconds = Number(slackEventTs);
    if (!Number.isFinite(seconds)) {
      return undefined;
    }

    return new Date(seconds * 1000).toISOString();
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown Slack processing failure';
  }
}
