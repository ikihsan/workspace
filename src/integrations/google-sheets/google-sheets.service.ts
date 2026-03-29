import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../core/config/app-config.service';
import { AppLogger } from '../../core/logger/app-logger.service';

const MAX_FETCH_ATTEMPTS = 3;

interface GoogleSheetsValuesResponse {
  values?: string[][];
}

export interface PreferenceSheetRow {
  email: string;
  preference: string;
}

interface CacheEntry {
  expiresAt: number;
  rows: PreferenceSheetRow[];
}

@Injectable()
export class GoogleSheetsService {
  private cache: CacheEntry | null = null;

  constructor(
    private readonly appConfigService: AppConfigService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(GoogleSheetsService.name);
  }

  async readPreferenceRows(forceRefresh = false): Promise<PreferenceSheetRow[]> {
    const now = Date.now();

    if (!forceRefresh && this.cache && this.cache.expiresAt > now) {
      return this.cache.rows;
    }

    const rows = await this.fetchWithRetry();
    this.cache = {
      rows,
      expiresAt: now + this.appConfigService.googleSheets.cacheTtlSeconds * 1000,
    };

    return rows;
  }

  private async fetchWithRetry(): Promise<PreferenceSheetRow[]> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS; attempt += 1) {
      try {
        const rows = await this.fetchRows();

        this.logger.info('Google Sheets preference rows fetched', {
          integration: 'google-sheets',
          attempt,
          rowCount: rows.length,
        });

        return rows;
      } catch (error: unknown) {
        lastError = error;

        this.logger.warn('Google Sheets fetch failed; retrying', {
          integration: 'google-sheets',
          attempt,
          maxAttempts: MAX_FETCH_ATTEMPTS,
          error: this.getErrorMessage(error),
        });

        if (attempt < MAX_FETCH_ATTEMPTS) {
          await this.delay(200 * 2 ** (attempt - 1));
        }
      }
    }

    throw lastError;
  }

  private async fetchRows(): Promise<PreferenceSheetRow[]> {
    const config = this.appConfigService.googleSheets;

    const range = encodeURIComponent(config.range);
    const endpoint =
      `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/${range}` +
      `?key=${encodeURIComponent(config.apiKey)}`;

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        accept: 'application/json',
      },
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Google Sheets API request failed (${response.status}): ${message}`);
    }

    const payload = (await response.json()) as GoogleSheetsValuesResponse;
    const values = payload.values ?? [];

    if (values.length <= 1) {
      return [];
    }

    const rows = values.slice(1);

    return rows
      .map((row): PreferenceSheetRow | null => {
        const email = row[0]?.trim().toLowerCase();
        const preference = row[1]?.trim().toLowerCase();

        if (!email || !preference) {
          return null;
        }

        return {
          email,
          preference,
        };
      })
      .filter((row): row is PreferenceSheetRow => row !== null);
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown Google Sheets error';
  }

  private async delay(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}
