import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { AppLogger } from '../../core/logger/app-logger.service';
import { SlackEventEnvelopeDto } from './dto/slack-event-envelope.dto';
import { SlackSignatureService } from './slack-signature.service';
import { SlackService } from './slack.service';

interface RequestWithRawBody extends Request {
  rawBody?: Buffer;
}

@Controller('integrations/slack')
export class SlackController {
  constructor(
    private readonly slackSignatureService: SlackSignatureService,
    private readonly slackService: SlackService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(SlackController.name);
  }

  @Post('events')
  @HttpCode(200)
  async handleEvents(
    @Req() request: RequestWithRawBody,
    @Body() envelope: SlackEventEnvelopeDto,
  ): Promise<Record<string, unknown>> {
    const rawBody = request.rawBody?.toString('utf8') ?? JSON.stringify(envelope);

    this.logger.info('Slack webhook request received', {
      integration: 'slack',
      envelopeType: envelope.type,
      eventId: envelope.event_id,
      innerEventType: envelope.event?.type,
      hasRawBody: Boolean(request.rawBody),
      contentLength: rawBody.length,
    });

    this.slackSignatureService.verify(request.headers, rawBody);

    this.logger.debug('Slack signature verified successfully', {
      integration: 'slack',
      eventId: envelope.event_id,
      envelopeType: envelope.type,
    });

    if (envelope.type === 'url_verification') {
      this.logger.info('Slack URL verification handled', {
        integration: 'slack',
        hasChallenge: Boolean(envelope.challenge),
      });

      return {
        challenge: envelope.challenge ?? '',
      };
    }

    const result = await this.slackService.handleEvent(envelope);

    this.logger.info('Slack webhook processing completed', {
      integration: 'slack',
      eventId: envelope.event_id,
      ok: result.ok,
      queued: result.queued,
      ignored: result.ignored,
      reason: result.reason,
    });

    return {
      ok: result.ok,
      queued: result.queued,
      ignored: result.ignored,
      reason: result.reason,
    };
  }
}
