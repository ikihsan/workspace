import {
  AttendanceEvent,
  AttendanceEventSource,
  AttendanceEventType,
  AttendanceSession,
  AttendanceSessionStatus,
  IdentityProvider,
  Prisma,
  User,
} from '@prisma/client';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DateTime } from 'luxon';
import { UsersService } from '../users/users.service';
import { UserIdentitiesService } from '../user-identities/user-identities.service';
import { ProcessAttendanceEventDto } from './dto/process-attendance-event.dto';
import { AttendanceRepository } from './attendance.repository';

const TRANSACTION_RETRY_ATTEMPTS = 3;

interface AttendanceMetrics {
  totalBreakSeconds: number;
  totalWorkSeconds: number;
}

export interface AttendanceEventResult {
  duplicate: boolean;
  userId: string;
  workDate: string;
  sessionId: string;
  sessionStatus: AttendanceSessionStatus;
  eventType: AttendanceEventType;
  eventTimestamp: string;
  metrics: AttendanceMetrics;
}

@Injectable()
export class AttendanceService {
  constructor(
    private readonly attendanceRepository: AttendanceRepository,
    private readonly usersService: UsersService,
    private readonly userIdentitiesService: UserIdentitiesService,
  ) {}

  async processEvent(
    processAttendanceEventDto: ProcessAttendanceEventDto,
  ): Promise<AttendanceEventResult> {
    this.validateIdentityInput(processAttendanceEventDto);

    const user = await this.resolveUser(processAttendanceEventDto);
    this.validateTimezone(user.timezone);

    const eventTimestamp = this.resolveTimestamp(processAttendanceEventDto.eventTimestamp);
    const workDate = this.resolveWorkDate(eventTimestamp, user.timezone);

    return this.executeWithRetry(async () => {
      return this.attendanceRepository.withTransaction(async (tx) => {
        const existingEvent = await this.attendanceRepository.findEventByIdempotencyKey(
          tx,
          processAttendanceEventDto.idempotencyKey,
        );

        if (existingEvent) {
          return this.buildDuplicateResponse(tx, existingEvent, user.id, workDate, eventTimestamp);
        }

        const session = await this.attendanceRepository.findSessionByUserAndWorkDate(
          tx,
          user.id,
          workDate,
        );

        const latestEvent = session
          ? await this.attendanceRepository.findLatestEventForSession(tx, session.id)
          : null;

        const transitionResult = await this.applyTransition(tx, {
          user,
          session,
          latestEvent,
          eventType: processAttendanceEventDto.eventType,
          source: processAttendanceEventDto.source ?? AttendanceEventSource.INTERNAL,
          eventTimestamp,
          idempotencyKey: processAttendanceEventDto.idempotencyKey,
          workDate,
        });

        const metrics = this.calculateMetrics(
          transitionResult.session,
          transitionResult.latestEvent,
          transitionResult.eventTimestamp,
        );

        return {
          duplicate: false,
          userId: transitionResult.session.userId,
          workDate: transitionResult.session.workDate,
          sessionId: transitionResult.session.id,
          sessionStatus: transitionResult.session.status,
          eventType: transitionResult.latestEvent.eventType,
          eventTimestamp: transitionResult.latestEvent.eventTimestamp.toISOString(),
          metrics,
        };
      });
    });
  }

  private async buildDuplicateResponse(
    tx: Prisma.TransactionClient,
    existingEvent: AttendanceEvent,
    fallbackUserId: string,
    fallbackWorkDate: string,
    now: Date,
  ): Promise<AttendanceEventResult> {
    const session = await this.attendanceRepository.findSessionById(tx, existingEvent.sessionId);

    if (!session) {
      throw new ConflictException('Idempotent event found without a valid session');
    }

    const latestEvent =
      (await this.attendanceRepository.findLatestEventForSession(tx, session.id)) ?? existingEvent;

    const metrics = this.calculateMetrics(session, latestEvent, now);

    return {
      duplicate: true,
      userId: session.userId ?? fallbackUserId,
      workDate: session.workDate ?? fallbackWorkDate,
      sessionId: session.id,
      sessionStatus: session.status,
      eventType: existingEvent.eventType,
      eventTimestamp: existingEvent.eventTimestamp.toISOString(),
      metrics,
    };
  }

  private async applyTransition(
    tx: Prisma.TransactionClient,
    input: {
      user: User;
      session: AttendanceSession | null;
      latestEvent: AttendanceEvent | null;
      eventType: AttendanceEventType;
      source: AttendanceEventSource;
      eventTimestamp: Date;
      idempotencyKey: string;
      workDate: string;
    },
  ): Promise<{ session: AttendanceSession; latestEvent: AttendanceEvent; eventTimestamp: Date }> {
    switch (input.eventType) {
      case AttendanceEventType.START:
        return this.handleStart(tx, input);
      case AttendanceEventType.BREAK:
        return this.handleBreak(tx, input);
      case AttendanceEventType.RESUME:
        return this.handleResume(tx, input);
      case AttendanceEventType.STOP:
        return this.handleStop(tx, input);
      default:
        throw new BadRequestException('Unsupported attendance event type');
    }
  }

  private async handleStart(
    tx: Prisma.TransactionClient,
    input: {
      user: User;
      session: AttendanceSession | null;
      latestEvent: AttendanceEvent | null;
      source: AttendanceEventSource;
      eventTimestamp: Date;
      idempotencyKey: string;
      workDate: string;
    },
  ): Promise<{ session: AttendanceSession; latestEvent: AttendanceEvent; eventTimestamp: Date }> {
    if (input.session) {
      if (input.session.status === AttendanceSessionStatus.OPEN) {
        throw new ConflictException('An active session already exists for this user and day');
      }

      throw new ConflictException('Attendance session already exists for this user and day');
    }

    const session = await this.attendanceRepository.createSession(tx, {
      user: {
        connect: {
          id: input.user.id,
        },
      },
      workDate: input.workDate,
      startedAt: input.eventTimestamp,
      status: AttendanceSessionStatus.OPEN,
      totalBreakSeconds: 0,
    });

    const event = await this.attendanceRepository.createEvent(tx, {
      user: {
        connect: {
          id: input.user.id,
        },
      },
      session: {
        connect: {
          id: session.id,
        },
      },
      eventType: AttendanceEventType.START,
      eventTimestamp: input.eventTimestamp,
      source: input.source,
      idempotencyKey: input.idempotencyKey,
    });

    return {
      session,
      latestEvent: event,
      eventTimestamp: input.eventTimestamp,
    };
  }

  private async handleBreak(
    tx: Prisma.TransactionClient,
    input: {
      user: User;
      session: AttendanceSession | null;
      latestEvent: AttendanceEvent | null;
      source: AttendanceEventSource;
      eventTimestamp: Date;
      idempotencyKey: string;
      workDate: string;
    },
  ): Promise<{ session: AttendanceSession; latestEvent: AttendanceEvent; eventTimestamp: Date }> {
    const session = this.ensureOpenSession(input.session, 'Cannot take break before starting session');
    this.ensureSequentialTimestamp(session.startedAt, input.eventTimestamp);

    if (!input.latestEvent) {
      throw new ConflictException('Cannot take break before starting session');
    }

    if (
      input.latestEvent.eventType !== AttendanceEventType.START &&
      input.latestEvent.eventType !== AttendanceEventType.RESUME
    ) {
      throw new ConflictException('Invalid transition: break is only allowed after start or resume');
    }

    this.ensureSequentialTimestamp(input.latestEvent.eventTimestamp, input.eventTimestamp);

    const event = await this.attendanceRepository.createEvent(tx, {
      user: {
        connect: {
          id: input.user.id,
        },
      },
      session: {
        connect: {
          id: session.id,
        },
      },
      eventType: AttendanceEventType.BREAK,
      eventTimestamp: input.eventTimestamp,
      source: input.source,
      idempotencyKey: input.idempotencyKey,
    });

    return {
      session,
      latestEvent: event,
      eventTimestamp: input.eventTimestamp,
    };
  }

  private async handleResume(
    tx: Prisma.TransactionClient,
    input: {
      user: User;
      session: AttendanceSession | null;
      latestEvent: AttendanceEvent | null;
      source: AttendanceEventSource;
      eventTimestamp: Date;
      idempotencyKey: string;
      workDate: string;
    },
  ): Promise<{ session: AttendanceSession; latestEvent: AttendanceEvent; eventTimestamp: Date }> {
    const session = this.ensureOpenSession(input.session, 'Cannot resume before starting session');

    if (!input.latestEvent || input.latestEvent.eventType !== AttendanceEventType.BREAK) {
      throw new ConflictException('Invalid transition: resume requires an active break');
    }

    this.ensureSequentialTimestamp(input.latestEvent.eventTimestamp, input.eventTimestamp);

    const breakDurationSeconds = this.toDurationSeconds(
      input.latestEvent.eventTimestamp,
      input.eventTimestamp,
    );

    const updatedSession = await this.attendanceRepository.updateSession(tx, session.id, {
      totalBreakSeconds: session.totalBreakSeconds + breakDurationSeconds,
    });

    const event = await this.attendanceRepository.createEvent(tx, {
      user: {
        connect: {
          id: input.user.id,
        },
      },
      session: {
        connect: {
          id: session.id,
        },
      },
      eventType: AttendanceEventType.RESUME,
      eventTimestamp: input.eventTimestamp,
      source: input.source,
      idempotencyKey: input.idempotencyKey,
    });

    return {
      session: updatedSession,
      latestEvent: event,
      eventTimestamp: input.eventTimestamp,
    };
  }

  private async handleStop(
    tx: Prisma.TransactionClient,
    input: {
      user: User;
      session: AttendanceSession | null;
      latestEvent: AttendanceEvent | null;
      source: AttendanceEventSource;
      eventTimestamp: Date;
      idempotencyKey: string;
      workDate: string;
    },
  ): Promise<{ session: AttendanceSession; latestEvent: AttendanceEvent; eventTimestamp: Date }> {
    const session = this.ensureOpenSession(input.session, 'Cannot stop before starting session');

    if (!input.latestEvent) {
      throw new ConflictException('Cannot stop before starting session');
    }

    if (input.latestEvent.eventType === AttendanceEventType.BREAK) {
      throw new ConflictException('Cannot stop while break is active; resume first');
    }

    this.ensureSequentialTimestamp(input.latestEvent.eventTimestamp, input.eventTimestamp);
    this.ensureSequentialTimestamp(session.startedAt, input.eventTimestamp);

    const updatedSession = await this.attendanceRepository.updateSession(tx, session.id, {
      endedAt: input.eventTimestamp,
      status: AttendanceSessionStatus.CLOSED,
    });

    const event = await this.attendanceRepository.createEvent(tx, {
      user: {
        connect: {
          id: input.user.id,
        },
      },
      session: {
        connect: {
          id: session.id,
        },
      },
      eventType: AttendanceEventType.STOP,
      eventTimestamp: input.eventTimestamp,
      source: input.source,
      idempotencyKey: input.idempotencyKey,
    });

    return {
      session: updatedSession,
      latestEvent: event,
      eventTimestamp: input.eventTimestamp,
    };
  }

  private validateIdentityInput(dto: ProcessAttendanceEventDto): void {
    const hasUserId = Boolean(dto.userId);
    const hasProviderPair = Boolean(dto.provider && dto.providerUserId);

    if (!hasUserId && !hasProviderPair) {
      throw new BadRequestException(
        'Either userId or provider + providerUserId must be provided',
      );
    }
  }

  private async resolveUser(dto: ProcessAttendanceEventDto): Promise<User> {
    if (dto.userId) {
      return this.usersService.findById(dto.userId);
    }

    const provider = dto.provider as IdentityProvider;
    const providerUserId = dto.providerUserId as string;

    const identity = await this.userIdentitiesService.findByProviderAndProviderUserId(
      provider,
      providerUserId,
    );

    if (!identity) {
      throw new NotFoundException('No user mapping found for provider identity');
    }

    return this.usersService.findById(identity.userId);
  }

  private resolveTimestamp(eventTimestamp?: string): Date {
    if (!eventTimestamp) {
      return new Date();
    }

    const parsed = new Date(eventTimestamp);

    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('Invalid eventTimestamp format');
    }

    return parsed;
  }

  private resolveWorkDate(eventTimestamp: Date, timezone: string): string {
    const localDate = DateTime.fromJSDate(eventTimestamp, { zone: 'utc' })
      .setZone(timezone)
      .toISODate();

    if (!localDate) {
      throw new BadRequestException('Unable to resolve work date from timestamp and timezone');
    }

    return localDate;
  }

  private validateTimezone(timezone: string): void {
    if (!DateTime.local().setZone(timezone).isValid) {
      throw new BadRequestException('User timezone is invalid');
    }
  }

  private ensureOpenSession(
    session: AttendanceSession | null,
    errorMessage: string,
  ): AttendanceSession {
    if (!session || session.status !== AttendanceSessionStatus.OPEN) {
      throw new ConflictException(errorMessage);
    }

    return session;
  }

  private ensureSequentialTimestamp(previous: Date, current: Date): void {
    if (current.getTime() < previous.getTime()) {
      throw new ConflictException('Event timestamp is earlier than the current session timeline');
    }
  }

  private toDurationSeconds(start: Date, end: Date): number {
    return Math.floor((end.getTime() - start.getTime()) / 1000);
  }

  private calculateMetrics(
    session: AttendanceSession,
    latestEvent: AttendanceEvent,
    now: Date,
  ): AttendanceMetrics {
    const accumulatedBreakSeconds = session.totalBreakSeconds;
    const activeBreakSeconds =
      session.status === AttendanceSessionStatus.OPEN &&
      latestEvent.eventType === AttendanceEventType.BREAK
        ? this.toDurationSeconds(latestEvent.eventTimestamp, now)
        : 0;

    const totalBreakSeconds = accumulatedBreakSeconds + activeBreakSeconds;

    const sessionEnd = session.endedAt ?? now;
    const elapsedSeconds = this.toDurationSeconds(session.startedAt, sessionEnd);
    const totalWorkSeconds = Math.max(0, elapsedSeconds - totalBreakSeconds);

    return {
      totalBreakSeconds,
      totalWorkSeconds,
    };
  }

  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    for (let attempt = 1; attempt <= TRANSACTION_RETRY_ATTEMPTS; attempt += 1) {
      try {
        return await operation();
      } catch (error: unknown) {
        const retryable =
          this.isRetryableTransactionError(error) || this.isUniqueConstraintError(error);

        if (!retryable || attempt === TRANSACTION_RETRY_ATTEMPTS) {
          if (this.isUniqueConstraintError(error)) {
            throw new ConflictException(
              'Duplicate idempotency key or concurrent session state conflict detected',
            );
          }

          throw error;
        }

        await this.delay(attempt * 20);
      }
    }

    throw new ConflictException('Transaction could not be completed due to concurrent updates');
  }

  private isRetryableTransactionError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2034'
    );
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }

  private async delay(milliseconds: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, milliseconds));
  }
}
