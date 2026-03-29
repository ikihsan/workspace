import { registerAs } from '@nestjs/config';

export interface QueueConfig {
  prefix: string;
  defaultAttempts: number;
  backoffMs: number;
}

export default registerAs('queue', () => {
  return {
    prefix: process.env.QUEUE_PREFIX,
    defaultAttempts: Number(process.env.QUEUE_DEFAULT_ATTEMPTS),
    backoffMs: Number(process.env.QUEUE_BACKOFF_MS),
  } as QueueConfig;
});
