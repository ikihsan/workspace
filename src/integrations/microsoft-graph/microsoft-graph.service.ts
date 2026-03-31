import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AppConfigService } from '../../core/config/app-config.service';
import { AppLogger } from '../../core/logger/app-logger.service';

const API_RETRY_ATTEMPTS = 3;

interface AccessTokenResponse {
  token_type: string;
  expires_in: number;
  access_token: string;
}

interface GraphOnlineMeetingResponse {
  id: string;
  joinWebUrl: string;
  subject?: string;
  startDateTime?: string;
  endDateTime?: string;
  [key: string]: unknown;
}

interface TokenCache {
  accessToken: string;
  expiresAtEpochMs: number;
}

export interface CreateGraphMeetingInput {
  organizerMicrosoftUserId: string;
  title: string;
  startTimeIso: string;
  endTimeIso: string;
  participantEmails: string[];
}

export interface GraphMeetingResult {
  externalMeetingId: string;
  joinUrl: string;
  metadata: Prisma.InputJsonValue;
}

@Injectable()
export class MicrosoftGraphService {
  private tokenCache: TokenCache | null = null;

  constructor(
    private readonly appConfigService: AppConfigService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(MicrosoftGraphService.name);
  }

  async createTeamsMeeting(input: CreateGraphMeetingInput): Promise<GraphMeetingResult> {
    const payload = {
      startDateTime: input.startTimeIso,
      endDateTime: input.endTimeIso,
      subject: input.title,
      participants: {
        attendees: input.participantEmails.map((email) => ({
          upn: email,
        })),
      },
    };

    let lastError: unknown;

    for (let attempt = 1; attempt <= API_RETRY_ATTEMPTS; attempt += 1) {
      try {
        const response = await this.callGraphWithToken(input.organizerMicrosoftUserId, payload);

        return {
          externalMeetingId: response.id,
          joinUrl: response.joinWebUrl,
          metadata: {
            subject: response.subject,
            startDateTime: response.startDateTime,
            endDateTime: response.endDateTime,
          },
        };
      } catch (error: unknown) {
        lastError = error;

        const retryable = this.isRetryableGraphError(error);
        this.logger.warn('Microsoft Graph meeting creation attempt failed', {
          integration: 'microsoft-graph',
          attempt,
          retryable,
          organizerMicrosoftUserId: input.organizerMicrosoftUserId,
          error: this.getErrorMessage(error),
        });

        if (!retryable || attempt === API_RETRY_ATTEMPTS) {
          break;
        }

        await this.delay(this.exponentialBackoffMs(attempt));
      }
    }

    throw lastError;
  }

  private async callGraphWithToken(
    organizerMicrosoftUserId: string,
    payload: Record<string, unknown>,
  ): Promise<GraphOnlineMeetingResponse> {
    const firstToken = await this.getAccessToken(false);
    const firstResponse = await this.executeCreateMeetingRequest(
      organizerMicrosoftUserId,
      firstToken,
      payload,
    );

    if (firstResponse.status !== 401) {
      return this.assertResponse(firstResponse);
    }

    const refreshedToken = await this.getAccessToken(true);
    const secondResponse = await this.executeCreateMeetingRequest(
      organizerMicrosoftUserId,
      refreshedToken,
      payload,
    );

    return this.assertResponse(secondResponse);
  }

  private async executeCreateMeetingRequest(
    organizerMicrosoftUserId: string,
    accessToken: string,
    payload: Record<string, unknown>,
  ): Promise<Response> {
    const url = `${this.appConfigService.microsoftGraph.graphBaseUrl}/users/${encodeURIComponent(
      organizerMicrosoftUserId,
    )}/onlineMeetings`;

    return fetch(url, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  }

  private async getAccessToken(forceRefresh: boolean): Promise<string> {
    const now = Date.now();

    if (
      !forceRefresh &&
      this.tokenCache &&
      this.tokenCache.expiresAtEpochMs > now + 30_000
    ) {
      return this.tokenCache.accessToken;
    }

    const config = this.appConfigService.microsoftGraph;

    if (!config.tenantId || !config.clientId || !config.clientSecret) {
      throw new Error('Microsoft Graph integration is not configured');
    }

    const body = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    });

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Microsoft token request failed (${response.status}): ${text}`);
    }

    const token = (await response.json()) as AccessTokenResponse;

    this.tokenCache = {
      accessToken: token.access_token,
      expiresAtEpochMs: Date.now() + token.expires_in * 1000,
    };

    return token.access_token;
  }

  private async assertResponse(response: Response): Promise<GraphOnlineMeetingResponse> {
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Microsoft Graph request failed (${response.status}): ${text}`);
    }

    const payload = (await response.json()) as GraphOnlineMeetingResponse;

    if (!payload.id || !payload.joinWebUrl) {
      throw new Error('Microsoft Graph meeting response is missing required fields');
    }

    return payload;
  }

  private isRetryableGraphError(error: unknown): boolean {
    const message = this.getErrorMessage(error);

    return (
      message.includes('(429)') ||
      message.includes('(500)') ||
      message.includes('(502)') ||
      message.includes('(503)') ||
      message.includes('(504)') ||
      message.includes('(401)') ||
      message.includes('fetch failed')
    );
  }

  private exponentialBackoffMs(attempt: number): number {
    return 300 * 2 ** (attempt - 1);
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown Microsoft Graph error';
  }

  private async delay(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}
