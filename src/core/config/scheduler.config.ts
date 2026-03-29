import { registerAs } from '@nestjs/config';

export interface SchedulerConfig {
  preferenceSyncCron: string;
  preferenceSyncTimezone: string;
}

export default registerAs('scheduler', () => {
  return {
    preferenceSyncCron: process.env.PREFERENCE_SYNC_CRON,
    preferenceSyncTimezone: process.env.PREFERENCE_SYNC_TIMEZONE,
  } as SchedulerConfig;
});
