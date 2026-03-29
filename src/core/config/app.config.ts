import { registerAs } from '@nestjs/config';
import { Env } from './env.schema';

export interface AppConfig {
  nodeEnv: Env['NODE_ENV'];
  port: number;
  logLevel: Env['LOG_LEVEL'];
  corsOrigin: string;
}

export default registerAs('app', () => {
  return {
    nodeEnv: process.env.NODE_ENV,
    port: Number(process.env.PORT),
    logLevel: process.env.LOG_LEVEL,
    corsOrigin: process.env.CORS_ORIGIN,
  } as AppConfig;
});
