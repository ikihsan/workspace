import { BadRequestException, Injectable } from '@nestjs/common';
import { PreferenceDay, PreferenceSource, PreferenceValue, ReminderStatus, User } from '@prisma/client';
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

    this.logger.info('Preference sync rows loaded', {
      module: 'preferences',
      fetchedRows: rows.length,
      validRows: validRows.length,
    });

    const usersByEmail = await this.loadUsersByEmail(validRows);

    const importedPreferenceKeys = new Set<string>();
    let importedCount = 0;

    for (const row of validRows) {
      const user = usersByEmail.get(row.email);
      const preference = this.toPreferenceValue(row.preference);

      if (!user || !preference) {
        this.logger.debug('Preference row skipped', {
          module: 'preferences',
          rowEmail: row.email,
          hasMappedUser: Boolean(user),
          preferenceValue: row.preference,
        });

        continue;
      }

      const localDate = this.resolveUserLocalDate(now, user.timezone);

      await this.preferencesRepository.upsertPreferenceDay(user.id, localDate, preference);

      this.logger.debug('Preference row persisted', {
        module: 'preferences',
        userId: user.id,
        email: row.email,
        localDate,
        preference,
      });

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
        this.logger.debug('Preference reminder not queued', {
          module: 'preferences',
          userId: user.id,
          date: localDate,
          created,
          reminderStatus: reminder.status,
        });

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

      this.logger.info('Preference reminder queued', {
        module: 'preferences',
        userId: user.id,
        date: localDate,
        reminderId: reminder.id,
      });
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

  async setDailyPreferenceFromIntent(
    userId: string,
    preference: PreferenceValue,
    dateToken?: string,
  ): Promise<PreferenceDay> {
    const user = await this.usersService.findById(userId);
    const date = this.resolveDateFromToken(dateToken, user.timezone);

    const result = await this.preferencesRepository.upsertPreferenceDay(
      userId,
      date,
      preference,
      PreferenceSource.GOOGLE_SHEETS,
    );

    this.logger.info('Preference set from AI intent', {
      module: 'preferences',
      userId,
      date,
      preference,
      source: PreferenceSource.GOOGLE_SHEETS,
    });

    return result;
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

  private resolveDateFromToken(dateToken: string | undefined, timezone: string): string {
    const now = DateTime.utc().setZone(timezone);
    const normalized = (dateToken ?? 'today').trim().toLowerCase();

    if (normalized === 'today') {
      return now.toISODate() as string;
    }

    if (normalized === 'tomorrow') {
      return now.plus({ days: 1 }).toISODate() as string;
    }

    const explicit = DateTime.fromISO(normalized, { zone: timezone });
    if (explicit.isValid) {
      return explicit.toISODate() as string;
    }

    throw new BadRequestException('Invalid preference date parameter');
  }
}
