import { Injectable } from '@nestjs/common';
import { createSign } from 'crypto';
import { AppConfigService } from '../../core/config/app-config.service';
import { AppLogger } from '../../core/logger/app-logger.service';

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
const TOKEN_EXPIRY_MARGIN_SECONDS = 60;

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

@Injectable()
export class GoogleSheetsAuthService {
  private cachedToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor(
    private readonly configService: AppConfigService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(GoogleSheetsAuthService.name);
  }

  async getAccessToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.tokenExpiresAt) {
      return this.cachedToken;
    }

    const config = this.configService.googleSheets;
    if (!config.serviceAccountEmail || !config.privateKey) {
      throw new Error('Google Sheets service account credentials not configured');
    }

    const now = Math.floor(Date.now() / 1000);
    const jwt = this.createJwt(
      {
        iss: config.serviceAccountEmail,
        scope: SHEETS_SCOPE,
        aud: TOKEN_ENDPOINT,
        iat: now,
        exp: now + 3600,
      },
      config.privateKey,
    );

    const response = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: `grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')}&assertion=${encodeURIComponent(jwt)}`,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Google OAuth token request failed (${response.status}): ${text}`);
    }

    const tokenData = (await response.json()) as TokenResponse;
    this.cachedToken = tokenData.access_token;
    this.tokenExpiresAt = Date.now() + (tokenData.expires_in - TOKEN_EXPIRY_MARGIN_SECONDS) * 1000;

    this.logger.debug('Google Sheets access token acquired', {
      integration: 'google-sheets',
      expiresIn: tokenData.expires_in,
    });

    return this.cachedToken;
  }

  private createJwt(payload: Record<string, unknown>, privateKey: string): string {
    const header = this.base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const claims = this.base64url(JSON.stringify(payload));
    const signingInput = `${header}.${claims}`;

    const key = privateKey.replace(/\\n/g, '\n');
    const signer = createSign('RSA-SHA256');
    signer.update(signingInput);
    const signature = signer
      .sign(key, 'base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    return `${signingInput}.${signature}`;
  }

  private base64url(data: string): string {
    return Buffer.from(data)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
}
