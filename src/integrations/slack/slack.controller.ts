import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common';
import { Request } from 'express';
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
  ) {}

  @Post('events')
  @HttpCode(200)
  async handleEvents(
    @Req() request: RequestWithRawBody,
    @Body() envelope: SlackEventEnvelopeDto,
  ): Promise<Record<string, unknown>> {
    const rawBody = request.rawBody?.toString('utf8') ?? JSON.stringify(envelope);

    this.slackSignatureService.verify(request.headers, rawBody);

    if (envelope.type === 'url_verification') {
      return {
        challenge: envelope.challenge ?? '',
      };
    }

    const result = await this.slackService.handleEvent(envelope);

    return {
      ok: result.ok,
      queued: result.queued,
      ignored: result.ignored,
      reason: result.reason,
    };
  }
}
