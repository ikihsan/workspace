import { registerAs } from '@nestjs/config';

export interface MicrosoftGraphConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  graphBaseUrl: string;
  tokenUrl: string;
}

export default registerAs('microsoftGraph', () => {
  const tenantId = process.env.MICROSOFT_TENANT_ID;
  const configuredTokenUrl = process.env.MICROSOFT_TOKEN_URL;

  const tokenUrl =
    configuredTokenUrl && configuredTokenUrl.includes('/common/')
      ? configuredTokenUrl.replace('/common/', `/${tenantId}/`)
      : configuredTokenUrl;

  return {
    tenantId,
    clientId: process.env.MICROSOFT_CLIENT_ID,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
    graphBaseUrl: process.env.MICROSOFT_GRAPH_BASE_URL,
    tokenUrl,
  } as MicrosoftGraphConfig;
});
