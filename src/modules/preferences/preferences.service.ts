import { Injectable } from '@nestjs/common';
import { PreferenceValue, ReminderStatus, User } from '@prisma/client';
import { DateTime } from 'luxon';
import { AppLogger } from '../../core/logger/app-logger.service';
import { BASE_QUEUE_NAMES } from '../../core/queue/queue.constants';
import { QueueService } from '../../core/queue/queue.service';
import {
  GoogleSheetsService,
  PreferenceSheetRow,
} from '../../integrations/google-sheets/google-sheets.service';
import { UsersService } from '../users/users.service';
import { PreferencesRepository } from './preferences.repository';

interface PreferenceSyncResult {
  imported: number;
  missing: number;
  remindersQueued: number;
}

@Injectable()
export class PreferencesService {
  constructor(
    private readonly googleSheetsService: GoogleSheetsService,
    private readonly usersService: UsersService,
    private readonly preferencesRepository: PreferencesRepository,
    private readonly queueService: QueueService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(PreferencesService.name);
  }

  async runDailySync(now = new Date()): Promise<PreferenceSyncResult> {
    const rows = await this.googleSheetsService.readPreferenceRows();
    const validRows = this.filterValidRows(rows);

    const usersByEmail = await this.loadUsersByEmail(validRows);

    const importedPreferenceKeys = new Set<string>();
    let importedCount = 0;

    for (const row of validRows) {
      const user = usersByEmail.get(row.email);
      const preference = this.toPreferenceValue(row.preference);

      if (!user || !preference) {
        continue;
      }

      const localDate = this.resolveUserLocalDate(now, user.timezone);

      await this.preferencesRepository.upsertPreferenceDay(user.id, localDate, preference);

      importedPreferenceKeys.add(this.buildUserDayKey(user.id, localDate));
      importedCount += 1;
    }

    const activeUsers = await this.usersService.findActiveUsers();

    let missingCount = 0;
    let remindersQueued = 0;

    for (const user of activeUsers) {
      const localDate = this.resolveUserLocalDate(now, user.timezone);
      const key = this.buildUserDayKey(user.id, localDate);

      if (importedPreferenceKeys.has(key)) {
        continue;
      }

      const existingPreference = await this.preferencesRepository.findPreferenceByUserAndDate(
        user.id,
        localDate,
      );

      if (existingPreference) {
        continue;
      }

      missingCount += 1;

      const { reminder, created } = await this.preferencesRepository.ensureMissingPreferenceReminder(
        user.id,
        localDate,
      );

      if (!created || reminder.status === ReminderStatus.SENT) {
        continue;
      }

      await this.queueService.addJob(
        BASE_QUEUE_NAMES.PREFERENCE_REMINDER,
        'send-missing-preference-reminder',
        {
          reminderId: reminder.id,
          userId: user.id,
          date: localDate,
        },
        {
          idempotencyKey: `preference-reminder:${user.id}:${localDate}`,
          attempts: 3,
        },
      );

      remindersQueued += 1;
    }

    this.logger.info('Daily preference sync completed', {
      module: 'preferences',
      imported: importedCount,
      missing: missingCount,
      remindersQueued,
    });

    return {
      imported: importedCount,
      missing: missingCount,
      remindersQueued,
    };
  }

  private filterValidRows(rows: PreferenceSheetRow[]): PreferenceSheetRow[] {
    return rows.filter((row) => row.email.trim().length > 0 && row.preference.trim().length > 0);
  }

  private async loadUsersByEmail(rows: PreferenceSheetRow[]): Promise<Map<string, User>> {
    const emails = rows.map((row) => row.email);
    const users = await this.usersService.findByEmails(emails);

    const map = new Map<string, User>();

    for (const user of users) {
      map.set(user.email.toLowerCase(), user);
    }

    return map;
  }

  private toPreferenceValue(value: string): PreferenceValue | null {
    const normalized = value.trim().toLowerCase();

    if (normalized === 'tea') {
      return PreferenceValue.TEA;
    }

    if (normalized === 'coffee') {
      return PreferenceValue.COFFEE;
    }

    return null;
  }

  private resolveUserLocalDate(now: Date, timezone: string): string {
    const date = DateTime.fromJSDate(now, { zone: 'utc' }).setZone(timezone).toISODate();

    if (!date) {
      return DateTime.fromJSDate(now, { zone: 'utc' }).toISODate() as string;
    }

    return date;
  }

  private buildUserDayKey(userId: string, localDate: string): string {
    return `${userId}:${localDate}`;
  }
}
