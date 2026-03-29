import { registerAs } from '@nestjs/config';

export interface DatabaseConfig {
  url: string;
}

export default registerAs('database', () => {
  return {
    url: process.env.DATABASE_URL,
  } as DatabaseConfig;
});
