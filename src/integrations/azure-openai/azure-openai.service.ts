import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../core/config/app-config.service';
import { AppLogger } from '../../core/logger/app-logger.service';

const API_RETRY_ATTEMPTS = 3;

export type AzureIntentAction = 'attendance' | 'meeting' | 'preference';

export interface AzureIntentParameters {
  eventType?: 'START' | 'BREAK' | 'RESUME' | 'STOP';
  title?: string;
  startTime?: string;
  durationMinutes?: number;
  participantUserIds?: string[];
  preference?: 'TEA' | 'COFFEE';
  date?: string;
}

export interface AzureIntentParseResult {
  action: AzureIntentAction;
  parameters: AzureIntentParameters;
}

interface AzureChatResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

@Injectable()
export class AzureOpenAiService {
  constructor(
    private readonly appConfigService: AppConfigService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(AzureOpenAiService.name);
  }

  async parseIntent(inputText: string): Promise<{ raw: string; parsed: AzureIntentParseResult }> {
    const config = this.appConfigService.azureOpenAi;

    if (!config.endpoint || !config.apiKey || !config.deployment) {
      throw new Error('Azure OpenAI integration is not configured');
    }

    const url = `${config.endpoint}/openai/deployments/${encodeURIComponent(config.deployment)}/chat/completions?api-version=${encodeURIComponent(config.apiVersion)}`;

    const systemPrompt = [
      'You parse HR assistant commands.',
      'Return strict JSON object only with keys: action, parameters.',
      'action must be one of: attendance, meeting, preference.',
      'For attendance, parameters.eventType must be one of START, BREAK, RESUME, STOP.',
      'For meeting, include title, startTime (ISO if inferable), durationMinutes, participantUserIds when available.',
      'For preference, include preference as TEA or COFFEE and date when inferable.',
      'Do not include markdown, comments, or extra keys.',
    ].join(' ');

    let lastError: unknown;

    for (let attempt = 1; attempt <= API_RETRY_ATTEMPTS; attempt += 1) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'api-key': config.apiKey,
          },
          body: JSON.stringify({
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: inputText },
            ],
            temperature: 0,
            response_format: { type: 'json_object' },
          }),
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Azure OpenAI request failed (${response.status}): ${text}`);
        }

        const payload = (await response.json()) as AzureChatResponse;
        const content = payload.choices?.[0]?.message?.content;

        if (!content) {
          throw new Error('Azure OpenAI returned empty content');
        }

        const parsed = JSON.parse(content) as AzureIntentParseResult;

        return {
          raw: content,
          parsed,
        };
      } catch (error: unknown) {
        lastError = error;

        this.logger.warn('Azure OpenAI parse attempt failed', {
          integration: 'azure-openai',
          attempt,
          error: this.getErrorMessage(error),
        });

        if (attempt === API_RETRY_ATTEMPTS) {
          break;
        }

        await this.delay(this.exponentialBackoffMs(attempt));
      }
    }

    throw lastError;
  }

  private exponentialBackoffMs(attempt: number): number {
    return 250 * 2 ** (attempt - 1);
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown Azure OpenAI error';
  }

  private async delay(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}
