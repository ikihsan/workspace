import { registerAs } from '@nestjs/config';

export interface GoogleSheetsConfig {
  apiKey: string;
  spreadsheetId: string;
  range: string;
  cacheTtlSeconds: number;
  serviceAccountEmail: string;
  privateKey: string;
  attendanceSheetName: string;
}

export default registerAs('googleSheets', () => {
  return {
    apiKey: process.env.GOOGLE_SHEETS_API_KEY,
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
    range: process.env.GOOGLE_SHEETS_RANGE,
    cacheTtlSeconds: Number(process.env.GOOGLE_SHEETS_CACHE_TTL_SECONDS),
    serviceAccountEmail: process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL,
    privateKey: process.env.GOOGLE_SHEETS_PRIVATE_KEY,
    attendanceSheetName: process.env.GOOGLE_SHEETS_ATTENDANCE_SHEET_NAME,
  } as GoogleSheetsConfig;
});
