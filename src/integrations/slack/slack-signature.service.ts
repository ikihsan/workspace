import { createHmac, timingSafeEqual } from 'node:crypto';
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { AppConfigService } from '../../core/config/app-config.service';
import { AppLogger } from '../../core/logger/app-logger.service';

const SLACK_SIGNATURE_VERSION = 'v0';
const TIMESTAMP_HEADER = 'x-slack-request-timestamp';
const SIGNATURE_HEADER = 'x-slack-signature';

@Injectable()
export class SlackSignatureService {
  constructor(
    private readonly configService: AppConfigService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(SlackSignatureService.name);
  }

  verify(headers: Record<string, string | string[] | undefined>, rawBody: string): void {
    if (!this.configService.slack.signingSecret) {
      this.logger.warn('Slack signature verification skipped because integration is not configured', {
        integration: 'slack',
        configured: false,
      });

      throw new BadRequestException('Slack integration is not configured');
    }

    const timestampHeader = headers[TIMESTAMP_HEADER];
    const signatureHeader = headers[SIGNATURE_HEADER];

    const timestamp = this.readHeader(timestampHeader, TIMESTAMP_HEADER);
    const signature = this.readHeader(signatureHeader, SIGNATURE_HEADER);

    this.logger.debug('Slack signature headers received', {
      integration: 'slack',
      hasTimestampHeader: Boolean(timestampHeader),
      hasSignatureHeader: Boolean(signatureHeader),
      rawBodyLength: rawBody.length,
    });

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
      this.logger.warn('Slack signature mismatch detected', {
        integration: 'slack',
        expectedLength: expectedBuffer.length,
        incomingLength: incomingBuffer.length,
      });

      throw new UnauthorizedException('Slack signature verification failed');
    }

    this.logger.debug('Slack signature validation passed', {
      integration: 'slack',
      timestamp,
    });
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
