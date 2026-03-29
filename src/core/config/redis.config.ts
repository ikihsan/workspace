import { registerAs } from '@nestjs/config';

export interface RedisConfig {
  host: string;
  port: number;
  password: string;
  db: number;
}

export default registerAs('redis', () => {
  return {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    password: process.env.REDIS_PASSWORD ?? '',
    db: Number(process.env.REDIS_DB),
  } as RedisConfig;
});
