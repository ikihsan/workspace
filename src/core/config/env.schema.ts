import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  CORS_ORIGIN: z.string().min(1).default('*'),
  DATABASE_URL: z.string().url(),
  REDIS_HOST: z.string().min(1),
  REDIS_PORT: z.coerce.number().int().positive(),
  REDIS_PASSWORD: z.string().optional().default(''),
  REDIS_DB: z.coerce.number().int().nonnegative().default(0),
  QUEUE_PREFIX: z.string().min(1).default('aihr'),
  QUEUE_DEFAULT_ATTEMPTS: z.coerce.number().int().min(1).default(3),
  QUEUE_BACKOFF_MS: z.coerce.number().int().min(100).default(1000),
  SLACK_SIGNING_SECRET: z.string().optional().default(''),
  SLACK_SIGNATURE_MAX_AGE_SECONDS: z.coerce.number().int().min(60).default(300),
  SLACK_BOT_TOKEN: z.string().optional().default(''),
  SLACK_API_BASE_URL: z.string().url().default('https://slack.com/api'),
  GOOGLE_SHEETS_API_KEY: z.string().optional().default(''),
  GOOGLE_SHEETS_SPREADSHEET_ID: z.string().optional().default(''),
  GOOGLE_SHEETS_RANGE: z.string().optional().default(''),
  GOOGLE_SHEETS_CACHE_TTL_SECONDS: z.coerce.number().int().min(0).default(300),
  GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL: z.string().optional().default(''),
  GOOGLE_SHEETS_PRIVATE_KEY: z.string().optional().default(''),
  GOOGLE_SHEETS_ATTENDANCE_SHEET_NAME: z.string().min(1).default('Attendance Log'),
  PREFERENCE_SYNC_CRON: z.string().min(1).default('0 9 * * *'),
  PREFERENCE_SYNC_TIMEZONE: z.string().min(1).default('UTC'),
  MICROSOFT_TENANT_ID: z.string().optional().default(''),
  MICROSOFT_CLIENT_ID: z.string().optional().default(''),
  MICROSOFT_CLIENT_SECRET: z.string().optional().default(''),
  MICROSOFT_GRAPH_BASE_URL: z.string().url().default('https://graph.microsoft.com/v1.0'),
  MICROSOFT_TOKEN_URL: z
    .string()
    .url()
    .default('https://login.microsoftonline.com/common/oauth2/v2.0/token'),
  AZURE_OPENAI_ENDPOINT: z.string().url().or(z.literal('')).default(''),
  AZURE_OPENAI_API_KEY: z.string().optional().default(''),
  AZURE_OPENAI_DEPLOYMENT: z.string().optional().default(''),
  AZURE_OPENAI_API_VERSION: z.string().min(1).default('2024-10-21'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  return envSchema.parse(config);
}
