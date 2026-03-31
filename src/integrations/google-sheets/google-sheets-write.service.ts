import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../core/config/app-config.service';
import { AppLogger } from '../../core/logger/app-logger.service';
import { GoogleSheetsAuthService } from './google-sheets-auth.service';

const ATTENDANCE_HEADERS = [
  'Date',
  'User Name',
  'Slack User ID',
  'Action',
  'Time',
  'Original Message',
  'Slack Timestamp',
  'Channel',
  'Event ID',
];

const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

export interface AttendanceLogEntry {
  eventId: string;
  date: string;
  userName: string;
  slackUserId: string;
  actionType: string;
  resolvedTime: string;
  originalMessage: string;
  slackTimestamp: string;
  channel: string;
}

@Injectable()
export class GoogleSheetsWriteService {
  private sheetInitialized = false;

  constructor(
    private readonly authService: GoogleSheetsAuthService,
    private readonly configService: AppConfigService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(GoogleSheetsWriteService.name);
  }

  isConfigured(): boolean {
    const config = this.configService.googleSheets;
    return Boolean(config.serviceAccountEmail && config.privateKey && config.spreadsheetId);
  }

  async logAttendanceEvent(entry: AttendanceLogEntry): Promise<void> {
    if (!this.isConfigured()) {
      this.logger.debug('Sheets write skipped: service account not configured', {
        integration: 'google-sheets',
      });
      return;
    }

    const config = this.configService.googleSheets;
    const spreadsheetId = config.spreadsheetId;
    const sheetName = config.attendanceSheetName;

    const token = await this.authService.getAccessToken();

    if (!this.sheetInitialized) {
      await this.ensureSheetExists(token, spreadsheetId, sheetName);
      await this.ensureHeaders(token, spreadsheetId, sheetName);
      this.sheetInitialized = true;
    }

    await this.appendRow(token, spreadsheetId, sheetName, [
      entry.date,
      entry.userName,
      entry.slackUserId,
      entry.actionType,
      entry.resolvedTime,
      entry.originalMessage,
      entry.slackTimestamp,
      entry.channel,
      entry.eventId,
    ]);

    this.logger.info('Attendance event logged to Google Sheets', {
      integration: 'google-sheets',
      eventId: entry.eventId,
      actionType: entry.actionType,
      slackUserId: entry.slackUserId,
    });
  }

  private async ensureSheetExists(
    token: string,
    spreadsheetId: string,
    sheetName: string,
  ): Promise<void> {
    const metaResponse = await fetch(
      `${SHEETS_API_BASE}/${spreadsheetId}?fields=sheets.properties.title`,
      {
        headers: { authorization: `Bearer ${token}` },
      },
    );

    if (!metaResponse.ok) {
      throw new Error(`Failed to get spreadsheet metadata: ${metaResponse.status}`);
    }

    const meta = (await metaResponse.json()) as {
      sheets?: { properties?: { title?: string } }[];
    };

    const exists = meta.sheets?.some((s) => s.properties?.title === sheetName);
    if (exists) {
      return;
    }

    const createResponse = await fetch(`${SHEETS_API_BASE}/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            addSheet: {
              properties: { title: sheetName },
            },
          },
        ],
      }),
    });

    if (!createResponse.ok) {
      const text = await createResponse.text();
      throw new Error(`Failed to create sheet tab "${sheetName}": ${text}`);
    }

    this.logger.info('Created new sheet tab for attendance logs', {
      integration: 'google-sheets',
      sheetName,
    });
  }

  private async ensureHeaders(
    token: string,
    spreadsheetId: string,
    sheetName: string,
  ): Promise<void> {
    const range = encodeURIComponent(`${sheetName}!A1:I1`);
    const response = await fetch(`${SHEETS_API_BASE}/${spreadsheetId}/values/${range}`, {
      headers: { authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error(`Failed to read header row: ${response.status}`);
    }

    const data = (await response.json()) as { values?: string[][] };
    if (data.values && data.values.length > 0) {
      return;
    }

    const writeResponse = await fetch(
      `${SHEETS_API_BASE}/${spreadsheetId}/values/${range}?valueInputOption=RAW`,
      {
        method: 'PUT',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ values: [ATTENDANCE_HEADERS] }),
      },
    );

    if (!writeResponse.ok) {
      const text = await writeResponse.text();
      throw new Error(`Failed to write headers: ${text}`);
    }

    this.logger.info('Initialized attendance sheet headers', {
      integration: 'google-sheets',
      sheetName,
    });
  }

  private async appendRow(
    token: string,
    spreadsheetId: string,
    sheetName: string,
    values: string[],
  ): Promise<void> {
    const range = encodeURIComponent(`${sheetName}!A:I`);
    const response = await fetch(
      `${SHEETS_API_BASE}/${spreadsheetId}/values/${range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ values: [values] }),
      },
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to append row to sheet: ${text}`);
    }
  }
}
