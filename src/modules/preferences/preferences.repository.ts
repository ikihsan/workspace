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

@Injectable()
export class PreferencesRepository {
  constructor(private readonly prismaService: PrismaService) {}

  upsertPreferenceDay(
    userId: string,
    date: string,
    preference: PreferenceValue,
  ): Promise<PreferenceDay> {
    return this.prismaService.preferenceDay.upsert({
      where: {
        userId_date: {
          userId,
          date,
        },
      },
      update: {
        preference,
        source: PreferenceSource.GOOGLE_SHEETS,
      },
      create: {
        userId,
        date,
        preference,
        source: PreferenceSource.GOOGLE_SHEETS,
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
