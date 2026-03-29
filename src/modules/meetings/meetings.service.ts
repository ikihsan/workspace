import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IdentityProvider, Prisma, User } from '@prisma/client';
import { DateTime } from 'luxon';
import { AppLogger } from '../../core/logger/app-logger.service';
import { BASE_QUEUE_NAMES } from '../../core/queue/queue.constants';
import { QueueService } from '../../core/queue/queue.service';
import {
  GraphMeetingResult,
  MicrosoftGraphService,
} from '../../integrations/microsoft-graph';
import { UserIdentitiesService } from '../user-identities/user-identities.service';
import { UsersService } from '../users/users.service';
import { CreateMeetingRequestDto } from './dto/create-meeting-request.dto';
import { MeetingsRepository } from './meetings.repository';

const CREATE_RETRY_ATTEMPTS = 3;

export interface MeetingCreationResult {
  requestId: string;
  status: 'created' | 'queued';
  meetingId?: string;
  joinUrl?: string;
}

@Injectable()
export class MeetingsService {
  constructor(
    private readonly meetingsRepository: MeetingsRepository,
    private readonly usersService: UsersService,
    private readonly userIdentitiesService: UserIdentitiesService,
    private readonly microsoftGraphService: MicrosoftGraphService,
    private readonly queueService: QueueService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(MeetingsService.name);
  }

  async createMeetingRequest(dto: CreateMeetingRequestDto): Promise<MeetingCreationResult> {
    const normalizedParticipants = this.normalizeParticipants(
      dto.organizerUserId,
      dto.participantUserIds,
    );

    if (normalizedParticipants.length === 0) {
      throw new BadRequestException('At least one participant besides organizer is required');
    }

    const startTime = this.parseStartTime(dto.startTime);

    const request = await this.meetingsRepository.createMeetingRequest({
      organizerUserId: dto.organizerUserId,
      participantUserIds: normalizedParticipants,
      startTime,
      durationMinutes: dto.durationMinutes,
      title: dto.title.trim(),
    });

    try {
      const created = await this.executeCreateForRequest(request.id);

      return {
        requestId: request.id,
        status: 'created',
        meetingId: created.id,
        joinUrl: created.joinUrl,
      };
    } catch (error: unknown) {
      await this.queueService.addJob(
        BASE_QUEUE_NAMES.MEETING_CREATE_RETRY,
        'retry-meeting-create',
        {
          requestId: request.id,
          retryAttempt: 0,
          firstFailureAt: new Date().toISOString(),
          lastError: this.getErrorMessage(error),
        },
        {
          attempts: 1,
          idempotencyKey: `meeting-create:${request.id}:0`,
        },
      );

      this.logger.error('Meeting creation failed; queued for retry', {
        module: 'meetings',
        requestId: request.id,
        error: this.getErrorMessage(error),
      });

      return {
        requestId: request.id,
        status: 'queued',
      };
    }
  }

  async executeCreateForRequest(requestId: string): Promise<{ id: string; joinUrl: string }> {
    const request = await this.meetingsRepository.findMeetingRequestById(requestId);

    if (!request) {
      throw new NotFoundException('Meeting request not found');
    }

    const existingMeeting = await this.meetingsRepository.findMeetingByRequestId(request.id);

    if (existingMeeting) {
      await this.meetingsRepository.markMeetingRequestCreated(request.id);

      return {
        id: existingMeeting.id,
        joinUrl: existingMeeting.joinUrl,
      };
    }

    const organizer = await this.usersService.findById(request.organizerUserId);
    const organizerIdentity = await this.userIdentitiesService.findByUserIdAndProvider(
      organizer.id,
      IdentityProvider.MICROSOFT,
    );

    if (!organizerIdentity) {
      throw new ConflictException('Organizer does not have a Microsoft identity mapping');
    }

    const participantUserIds = this.parseParticipantIds(request.participantUserIds);
    const participants = await this.loadParticipants(participantUserIds);

    const participantEmails = await this.validateMicrosoftParticipantMappings(participants);

    const endTime = DateTime.fromJSDate(request.startTime, { zone: 'utc' })
      .plus({ minutes: request.durationMinutes })
      .toJSDate();

    const graphResult = await this.executeGraphCreationWithRetry({
      organizerMicrosoftUserId: organizerIdentity.providerUserId,
      title: request.title,
      startTimeIso: request.startTime.toISOString(),
      endTimeIso: endTime.toISOString(),
      participantEmails,
    });

    const meeting = await this.persistMeetingResult(request.id, graphResult);

    return {
      id: meeting.id,
      joinUrl: meeting.joinUrl,
    };
  }

  private async persistMeetingResult(
    requestId: string,
    graphResult: GraphMeetingResult,
  ): Promise<{ id: string; joinUrl: string }> {
    try {
      const meeting = await this.meetingsRepository.createMeeting({
        requestId,
        externalMeetingId: graphResult.externalMeetingId,
        joinUrl: graphResult.joinUrl,
        metadata: graphResult.metadata,
      });

      await this.meetingsRepository.markMeetingRequestCreated(requestId);

      return {
        id: meeting.id,
        joinUrl: meeting.joinUrl,
      };
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existing = await this.meetingsRepository.findMeetingByRequestId(requestId);

        if (!existing) {
          throw error;
        }

        await this.meetingsRepository.markMeetingRequestCreated(requestId);

        return {
          id: existing.id,
          joinUrl: existing.joinUrl,
        };
      }

      throw error;
    }
  }

  private async executeGraphCreationWithRetry(input: {
    organizerMicrosoftUserId: string;
    title: string;
    startTimeIso: string;
    endTimeIso: string;
    participantEmails: string[];
  }): Promise<GraphMeetingResult> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= CREATE_RETRY_ATTEMPTS; attempt += 1) {
      try {
        return await this.microsoftGraphService.createTeamsMeeting(input);
      } catch (error: unknown) {
        lastError = error;

        if (attempt === CREATE_RETRY_ATTEMPTS) {
          break;
        }

        await this.delay(200 * 2 ** (attempt - 1));
      }
    }

    throw lastError;
  }

  private async loadParticipants(participantUserIds: string[]): Promise<User[]> {
    return Promise.all(participantUserIds.map((participantUserId) => this.usersService.findById(participantUserId)));
  }

  private async validateMicrosoftParticipantMappings(participants: User[]): Promise<string[]> {
    const emails: string[] = [];

    for (const participant of participants) {
      const identity = await this.userIdentitiesService.findByUserIdAndProvider(
        participant.id,
        IdentityProvider.MICROSOFT,
      );

      if (!identity) {
        throw new ConflictException(
          `Participant ${participant.id} does not have a Microsoft identity mapping`,
        );
      }

      emails.push(participant.email);
    }

    return emails;
  }

  private parseParticipantIds(value: Prisma.JsonValue): string[] {
    if (!Array.isArray(value)) {
      throw new BadRequestException('Invalid participant user ids in meeting request');
    }

    const ids = value.filter((item): item is string => typeof item === 'string');

    if (ids.length !== value.length) {
      throw new BadRequestException('Invalid participant user ids in meeting request');
    }

    return ids;
  }

  private parseStartTime(startTime: string): Date {
    const parsed = new Date(startTime);

    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('Invalid start time');
    }

    return parsed;
  }

  private normalizeParticipants(organizerUserId: string, participantUserIds: string[]): string[] {
    return participantUserIds
      .map((userId) => userId.trim())
      .filter((userId, index, array) => array.indexOf(userId) === index)
      .filter((userId) => userId !== organizerUserId);
  }

  async markRequestFailed(requestId: string, reason: string): Promise<void> {
    await this.meetingsRepository.markMeetingRequestFailed(requestId, reason);
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown meeting creation error';
  }

  private async delay(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}
