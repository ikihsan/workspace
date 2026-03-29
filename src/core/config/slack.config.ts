import { registerAs } from '@nestjs/config';

export interface SlackConfig {
  signingSecret: string;
  signatureMaxAgeSeconds: number;
  botToken: string;
  apiBaseUrl: string;
}

export default registerAs('slack', () => {
  return {
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    signatureMaxAgeSeconds: Number(process.env.SLACK_SIGNATURE_MAX_AGE_SECONDS),
    botToken: process.env.SLACK_BOT_TOKEN,
    apiBaseUrl: process.env.SLACK_API_BASE_URL,
  } as SlackConfig;
});
