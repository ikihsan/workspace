import { BadRequestException, Injectable } from '@nestjs/common';
import { AttendanceEventSource, AttendanceEventType, PreferenceValue } from '@prisma/client';
import { DateTime } from 'luxon';
import { z } from 'zod';
import { AppLogger } from '../../core/logger/app-logger.service';
import { BASE_QUEUE_NAMES } from '../../core/queue/queue.constants';
import { QueueService } from '../../core/queue/queue.service';
import {
  AzureIntentParseResult,
  AzureOpenAiService,
} from '../../integrations/azure-openai';
import { AttendanceService } from '../attendance/attendance.service';
import { MeetingsService } from '../meetings/meetings.service';
import { PreferencesService } from '../preferences/preferences.service';
import { ProcessAiCommandDto } from './dto/process-ai-command.dto';

const intentSchema = z.object({
  action: z.enum(['attendance', 'meeting', 'preference']),
  parameters: z.record(z.unknown()),
});

type IntentAction = z.infer<typeof intentSchema>['action'];

interface NormalizedIntent {
  action: IntentAction;
  parameters: {
    eventType?: AttendanceEventType;
    title?: string;
    startTime?: string;
    durationMinutes?: number;
    participantUserIds?: string[];
    preference?: PreferenceValue;
    date?: string;
  };
}

export interface ProcessAiCommandResult {
  parser: 'ai' | 'fallback';
  action: IntentAction;
  parameters: Record<string, unknown>;
  execution: {
    target: 'attendance' | 'meeting' | 'preference';
    result: Record<string, unknown>;
  };
}

@Injectable()
export class AiAgentService {
  constructor(
    private readonly azureOpenAiService: AzureOpenAiService,
    private readonly attendanceService: AttendanceService,
    private readonly meetingsService: MeetingsService,
    private readonly preferencesService: PreferencesService,
    private readonly queueService: QueueService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(AiAgentService.name);
  }

  async processCommand(dto: ProcessAiCommandDto): Promise<ProcessAiCommandResult> {
    const text = dto.text.trim();
    const interactionId = `ai-intent:${dto.userId}:${Date.now()}`;

    let intent: NormalizedIntent;
    let parser: 'ai' | 'fallback' = 'ai';
    let aiRaw = '';

    try {
      const aiResult = await this.azureOpenAiService.parseIntent(text);
      aiRaw = aiResult.raw;

      const validated = this.validateAiShape(aiResult.parsed);
      intent = this.normalizeIntent(validated.action, validated.parameters as Record<string, unknown>);
    } catch (error: unknown) {
      parser = 'fallback';
      intent = this.fallbackParse(text, dto);

      await this.queueService.addJob(
        BASE_QUEUE_NAMES.SYSTEM_RETRY,
        'ai-intent-parse-failure',
        {
          userId: dto.userId,
          text,
          error: this.getErrorMessage(error),
          createdAt: new Date().toISOString(),
          fallbackAction: intent.action,
        },
        {
          attempts: 1,
          idempotencyKey: `${interactionId}:parse-failure`,
        },
      );

      this.logger.warn('AI parse failed; deterministic fallback applied', {
        module: 'ai-agent',
        userId: dto.userId,
        interactionId,
        error: this.getErrorMessage(error),
      });
    }

    this.logger.info('AI interaction processed', {
      module: 'ai-agent',
      userId: dto.userId,
      interactionId,
      parser,
      action: intent.action,
      text: this.truncate(text),
      aiRaw: this.truncate(aiRaw),
      parameters: intent.parameters,
    });

    const execution = await this.routeIntent(dto, intent, interactionId);

    return {
      parser,
      action: intent.action,
      parameters: intent.parameters,
      execution,
    };
  }

  private validateAiShape(value: AzureIntentParseResult): z.infer<typeof intentSchema> {
    const parsed = intentSchema.safeParse(value);

    if (!parsed.success) {
      throw new Error('AI returned invalid intent schema');
    }

    return parsed.data;
  }

  private normalizeIntent(action: IntentAction, parameters: Record<string, unknown>): NormalizedIntent {
    if (action === 'attendance') {
      const eventType = this.toAttendanceEventType(parameters.eventType);

      if (!eventType) {
        throw new Error('AI attendance intent missing valid eventType');
      }

      return {
        action,
        parameters: {
          eventType,
        },
      };
    }

    if (action === 'preference') {
      const preference = this.toPreferenceValue(parameters.preference);

      if (!preference) {
        throw new Error('AI preference intent missing valid preference');
      }

      const date = typeof parameters.date === 'string' ? parameters.date : undefined;

      return {
        action,
        parameters: {
          preference,
          date,
        },
      };
    }

    const participantUserIds = Array.isArray(parameters.participantUserIds)
      ? parameters.participantUserIds.filter((item): item is string => typeof item === 'string')
      : undefined;

    return {
      action,
      parameters: {
        title: typeof parameters.title === 'string' ? parameters.title : undefined,
        startTime: typeof parameters.startTime === 'string' ? parameters.startTime : undefined,
        durationMinutes:
          typeof parameters.durationMinutes === 'number' ? parameters.durationMinutes : undefined,
        participantUserIds,
      },
    };
  }

  private fallbackParse(text: string, dto: ProcessAiCommandDto): NormalizedIntent {
    const normalized = text.toLowerCase();

    const attendanceEventType = this.detectAttendanceEventType(normalized);
    if (attendanceEventType) {
      return {
        action: 'attendance',
        parameters: {
          eventType: attendanceEventType,
        },
      };
    }

    const preference = this.detectPreference(normalized);
    if (preference) {
      return {
        action: 'preference',
        parameters: {
          preference,
          date: this.detectDateToken(normalized) ?? 'today',
        },
      };
    }

    if (normalized.includes('meeting')) {
      return {
        action: 'meeting',
        parameters: {
          title: dto.context?.title ?? 'Meeting',
          startTime: dto.context?.startTime ?? this.detectRelativeDateTime(normalized),
          durationMinutes: dto.context?.durationMinutes ?? 30,
          participantUserIds: dto.context?.participantUserIds ?? [],
        },
      };
    }

    throw new BadRequestException('Unable to parse intent from text');
  }

  private async routeIntent(
    dto: ProcessAiCommandDto,
    intent: NormalizedIntent,
    interactionId: string,
  ): Promise<{
    target: 'attendance' | 'meeting' | 'preference';
    result: Record<string, unknown>;
  }> {
    if (intent.action === 'attendance') {
      const eventType = intent.parameters.eventType;

      if (!eventType) {
        throw new BadRequestException('Attendance intent requires eventType');
      }

      const result = await this.attendanceService.processEvent({
        eventType,
        source: AttendanceEventSource.INTERNAL,
        userId: dto.userId,
        idempotencyKey: `${interactionId}:${eventType}`,
      });

      return {
        target: 'attendance',
        result: {
          duplicate: result.duplicate,
          sessionId: result.sessionId,
          eventType: result.eventType,
          eventTimestamp: result.eventTimestamp,
        },
      };
    }

    if (intent.action === 'preference') {
      const preference = intent.parameters.preference;
      if (!preference) {
        throw new BadRequestException('Preference intent requires preference value');
      }

      const result = await this.preferencesService.setDailyPreferenceFromIntent(
        dto.userId,
        preference,
        intent.parameters.date,
      );

      return {
        target: 'preference',
        result: {
          preferenceDayId: result.id,
          date: result.date,
          preference: result.preference,
        },
      };
    }

    const participantUserIds =
      intent.parameters.participantUserIds && intent.parameters.participantUserIds.length > 0
        ? intent.parameters.participantUserIds
        : dto.context?.participantUserIds ?? [];

    const startTime = intent.parameters.startTime ?? dto.context?.startTime;
    const durationMinutes = intent.parameters.durationMinutes ?? dto.context?.durationMinutes ?? 30;
    const title = intent.parameters.title ?? dto.context?.title ?? 'Meeting';

    if (participantUserIds.length === 0) {
      throw new BadRequestException('Meeting intent requires participantUserIds context');
    }

    if (!startTime) {
      throw new BadRequestException('Meeting intent requires startTime');
    }

    const result = await this.meetingsService.createMeetingRequest({
      organizerUserId: dto.userId,
      participantUserIds,
      startTime,
      durationMinutes,
      title,
    });

    return {
      target: 'meeting',
      result: {
        requestId: result.requestId,
        status: result.status,
        meetingId: result.meetingId,
        joinUrl: result.joinUrl,
      },
    };
  }

  private detectAttendanceEventType(text: string): AttendanceEventType | null {
    if (text.includes('started work') || text.includes('start work') || text.includes('clock in')) {
      return AttendanceEventType.START;
    }

    if (text.includes('taking a break') || text.includes('on break') || text.includes('take break')) {
      return AttendanceEventType.BREAK;
    }

    if (text.includes('resume') || text.includes('back to work')) {
      return AttendanceEventType.RESUME;
    }

    if (text.includes('stop work') || text.includes('ended work') || text.includes('clock out')) {
      return AttendanceEventType.STOP;
    }

    return null;
  }

  private detectPreference(text: string): PreferenceValue | null {
    if (text.includes('tea')) {
      return PreferenceValue.TEA;
    }

    if (text.includes('coffee')) {
      return PreferenceValue.COFFEE;
    }

    return null;
  }

  private detectDateToken(text: string): string | undefined {
    if (text.includes('today')) {
      return 'today';
    }

    if (text.includes('tomorrow')) {
      return 'tomorrow';
    }

    return undefined;
  }

  private detectRelativeDateTime(text: string): string | undefined {
    const match = text.match(/(today|tomorrow)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);

    if (!match) {
      return undefined;
    }

    const dayToken = match[1]?.toLowerCase();
    const hourPart = Number(match[2]);
    const minutePart = Number(match[3] ?? '0');
    const meridiem = match[4]?.toLowerCase();

    const hour24 =
      meridiem === 'pm' ? (hourPart % 12) + 12 : hourPart % 12;

    const base = DateTime.utc();
    const date = dayToken === 'tomorrow' ? base.plus({ days: 1 }) : base;

    return date
      .set({ hour: hour24, minute: minutePart, second: 0, millisecond: 0 })
      .toISO();
  }

  private toAttendanceEventType(value: unknown): AttendanceEventType | null {
    if (typeof value !== 'string') {
      return null;
    }

    const normalized = value.trim().toUpperCase();

    if (normalized === 'START') {
      return AttendanceEventType.START;
    }

    if (normalized === 'BREAK') {
      return AttendanceEventType.BREAK;
    }

    if (normalized === 'RESUME') {
      return AttendanceEventType.RESUME;
    }

    if (normalized === 'STOP') {
      return AttendanceEventType.STOP;
    }

    return null;
  }

  private toPreferenceValue(value: unknown): PreferenceValue | null {
    if (typeof value !== 'string') {
      return null;
    }

    const normalized = value.trim().toUpperCase();

    if (normalized === 'TEA') {
      return PreferenceValue.TEA;
    }

    if (normalized === 'COFFEE') {
      return PreferenceValue.COFFEE;
    }

    return null;
  }

  private truncate(value: string, maxLength = 800): string {
    if (value.length <= maxLength) {
      return value;
    }

    return `${value.slice(0, maxLength)}...`;
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown AI agent error';
  }
}
