import {
  PreferenceDay,
  PreferenceSource,
  PreferenceValue,
  Prisma,
  Reminder,
  ReminderChannel,
  ReminderStatus,
  ReminderType,
} from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AppLogger } from '../../core/logger/app-logger.service';

@Injectable()
export class PreferencesRepository {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(PreferencesRepository.name);
  }

  upsertPreferenceDay(
    userId: string,
    date: string,
    preference: PreferenceValue,
    source: PreferenceSource = PreferenceSource.GOOGLE_SHEETS,
  ): Promise<PreferenceDay> {
    this.logger.debug('DB write: upsert preference day', {
      module: 'preferences',
      operation: 'upsertPreferenceDay',
      userId,
      date,
      preference,
      source,
    });

    return this.prismaService.preferenceDay.upsert({
      where: {
        userId_date: {
          userId,
          date,
        },
      },
      update: {
        preference,
        source,
      },
      create: {
        userId,
        date,
        preference,
        source,
      },
    });
  }

  findPreferenceByUserAndDate(userId: string, date: string): Promise<PreferenceDay | null> {
    return this.prismaService.preferenceDay.findUnique({
      where: {
        userId_date: {
          userId,
          date,
        },
      },
    });
  }

  async ensureMissingPreferenceReminder(
    userId: string,
    date: string,
  ): Promise<{ reminder: Reminder; created: boolean }> {
    const existing = await this.prismaService.reminder.findUnique({
      where: {
        userId_date_reminderType_channel: {
          userId,
          date,
          reminderType: ReminderType.MISSING_PREFERENCE,
          channel: ReminderChannel.SLACK,
        },
      },
    });

    if (existing) {
      this.logger.debug('DB read-hit: missing preference reminder already exists', {
        module: 'preferences',
        operation: 'ensureMissingPreferenceReminder',
        userId,
        date,
        reminderId: existing.id,
      });

      return {
        reminder: existing,
        created: false,
      };
    }

    try {
      const created = await this.prismaService.reminder.create({
        data: {
          userId,
          date,
          reminderType: ReminderType.MISSING_PREFERENCE,
          channel: ReminderChannel.SLACK,
          status: ReminderStatus.PENDING,
          attemptCount: 0,
        },
      });

      return {
        reminder: created,
        created: true,
      };
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const conflictRecord = await this.prismaService.reminder.findUniqueOrThrow({
          where: {
            userId_date_reminderType_channel: {
              userId,
              date,
              reminderType: ReminderType.MISSING_PREFERENCE,
              channel: ReminderChannel.SLACK,
            },
          },
        });

        this.logger.warn('DB unique conflict while creating reminder; using existing record', {
          module: 'preferences',
          operation: 'ensureMissingPreferenceReminder',
          userId,
          date,
          reminderId: conflictRecord.id,
        });

        return {
          reminder: conflictRecord,
          created: false,
        };
      }

      throw error;
    }
  }

  findReminderById(reminderId: string): Promise<Reminder | null> {
    return this.prismaService.reminder.findUnique({
      where: {
        id: reminderId,
      },
    });
  }

  markReminderSent(reminderId: string): Promise<Reminder> {
    this.logger.debug('DB write: mark reminder sent', {
      module: 'preferences',
      operation: 'markReminderSent',
      reminderId,
    });

    return this.prismaService.reminder.update({
      where: {
        id: reminderId,
      },
      data: {
        status: ReminderStatus.SENT,
        sentAt: new Date(),
      },
    });
  }

  incrementReminderFailure(reminderId: string, errorMessage: string): Promise<Reminder> {
    this.logger.debug('DB write: increment reminder failure', {
      module: 'preferences',
      operation: 'incrementReminderFailure',
      reminderId,
      errorMessage,
    });

    return this.prismaService.reminder.update({
      where: {
        id: reminderId,
      },
      data: {
        status: ReminderStatus.FAILED,
        attemptCount: {
          increment: 1,
        },
        lastError: errorMessage,
      },
    });
  }

  markPreferenceDayReminded(userId: string, date: string): Promise<PreferenceDay> {
    this.logger.debug('DB write: mark preference day reminded', {
      module: 'preferences',
      operation: 'markPreferenceDayReminded',
      userId,
      date,
    });

    return this.prismaService.preferenceDay.update({
      where: {
        userId_date: {
          userId,
          date,
        },
      },
      data: {
        remindedAt: new Date(),
      },
    });
  }
}
