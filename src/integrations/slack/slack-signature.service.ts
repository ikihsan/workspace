import { createHmac, timingSafeEqual } from 'node:crypto';
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { AppConfigService } from '../../core/config/app-config.service';

const SLACK_SIGNATURE_VERSION = 'v0';
const TIMESTAMP_HEADER = 'x-slack-request-timestamp';
const SIGNATURE_HEADER = 'x-slack-signature';

@Injectable()
export class SlackSignatureService {
  constructor(private readonly configService: AppConfigService) {}

  verify(headers: Record<string, string | string[] | undefined>, rawBody: string): void {
    const timestampHeader = headers[TIMESTAMP_HEADER];
    const signatureHeader = headers[SIGNATURE_HEADER];

    const timestamp = this.readHeader(timestampHeader, TIMESTAMP_HEADER);
    const signature = this.readHeader(signatureHeader, SIGNATURE_HEADER);

    this.assertTimestampIsFresh(timestamp);

    const signedPayload = `${SLACK_SIGNATURE_VERSION}:${timestamp}:${rawBody}`;
    const expectedSignature = `${SLACK_SIGNATURE_VERSION}=${createHmac('sha256', this.configService.slack.signingSecret)
      .update(signedPayload)
      .digest('hex')}`;

    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const incomingBuffer = Buffer.from(signature, 'utf8');

    if (
      expectedBuffer.length !== incomingBuffer.length ||
      !timingSafeEqual(expectedBuffer, incomingBuffer)
    ) {
      throw new UnauthorizedException('Slack signature verification failed');
    }
  }

  private readHeader(
    value: string | string[] | undefined,
    headerName: string,
  ): string {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }

    throw new BadRequestException(`Missing required Slack header: ${headerName}`);
  }

  private assertTimestampIsFresh(timestamp: string): void {
    const requestTs = Number(timestamp);

    if (!Number.isFinite(requestTs)) {
      throw new BadRequestException('Invalid Slack timestamp header');
    }

    const ageSeconds = Math.abs(Math.floor(Date.now() / 1000) - requestTs);
    if (ageSeconds > this.configService.slack.signatureMaxAgeSeconds) {
      throw new UnauthorizedException('Slack request timestamp is outside allowed replay window');
    }
  }
}
