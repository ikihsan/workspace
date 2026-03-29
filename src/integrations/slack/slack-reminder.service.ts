import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../core/config/app-config.service';
import { AppLogger } from '../../core/logger/app-logger.service';

interface SlackMessageResponse {
  ok: boolean;
  error?: string;
}

@Injectable()
export class SlackReminderService {
  constructor(
    private readonly appConfigService: AppConfigService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(SlackReminderService.name);
  }

  async sendMissingPreferenceReminder(slackUserId: string, date: string): Promise<void> {
    const payload = {
      channel: slackUserId,
      text: `Please submit your tea/coffee preference for ${date}.`,
    };

    const response = await fetch(`${this.appConfigService.slack.apiBaseUrl}/chat.postMessage`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.appConfigService.slack.botToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();

      this.logger.error('Slack reminder HTTP request failed', {
        integration: 'slack',
        slackUserId,
        date,
        statusCode: response.status,
        response: text,
      });

      throw new Error(`Slack reminder HTTP request failed (${response.status})`);
    }

    const result = (await response.json()) as SlackMessageResponse;

    if (!result.ok) {
      this.logger.error('Slack reminder API rejected request', {
        integration: 'slack',
        slackUserId,
        date,
        error: result.error,
      });

      throw new Error(`Slack reminder API error: ${result.error ?? 'unknown_error'}`);
    }

    this.logger.info('Slack reminder sent', {
      integration: 'slack',
      slackUserId,
      date,
    });
  }
}
