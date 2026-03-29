import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { IdentityProvider, ReminderStatus } from '@prisma/client';
import { Job, Worker } from 'bullmq';
import { AppConfigService } from '../../core/config/app-config.service';
import { AppLogger } from '../../core/logger/app-logger.service';
import { BASE_QUEUE_NAMES } from '../../core/queue/queue.constants';
import { getJobCorrelationId, QueueJobPayload } from '../base.worker';
import { SlackReminderService } from '../../integrations/slack';
import { PreferencesRepository } from '../../modules/preferences/preferences.repository';
import { UserIdentitiesService } from '../../modules/user-identities/user-identities.service';

interface PreferenceReminderJobPayload extends QueueJobPayload {
  reminderId: string;
  userId: string;
  date: string;
}

@Injectable()
export class PreferenceReminderWorker implements OnModuleInit, OnModuleDestroy {
  private worker: Worker<PreferenceReminderJobPayload> | null = null;

  constructor(
    private readonly appConfigService: AppConfigService,
    private readonly preferencesRepository: PreferencesRepository,
    private readonly userIdentitiesService: UserIdentitiesService,
    private readonly slackReminderService: SlackReminderService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(PreferenceReminderWorker.name);
  }

  onModuleInit(): void {
    const redis = this.appConfigService.redis;

    this.worker = new Worker<PreferenceReminderJobPayload>(
      BASE_QUEUE_NAMES.PREFERENCE_REMINDER,
      async (job: Job<PreferenceReminderJobPayload>) => this.process(job),
      {
        prefix: this.appConfigService.queue.prefix,
        connection: {
          host: redis.host,
          port: redis.port,
          password: redis.password || undefined,
          db: redis.db,
        },
        concurrency: 5,
      },
    );
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
    }
  }

  private async process(job: Job<PreferenceReminderJobPayload>): Promise<void> {
    const correlationId = getJobCorrelationId(job.data);

    this.logger.traceJobStart(
      job.name,
      BASE_QUEUE_NAMES.PREFERENCE_REMINDER,
      String(job.id),
      correlationId,
    );

    const reminder = await this.preferencesRepository.findReminderById(job.data.reminderId);

    if (!reminder || reminder.status === ReminderStatus.SENT) {
      this.logger.info('Skipping reminder job because reminder is missing or already sent', {
        module: 'preferences',
        reminderId: job.data.reminderId,
        queueName: BASE_QUEUE_NAMES.PREFERENCE_REMINDER,
        correlationId,
      });

      return;
    }

    const slackIdentity = await this.userIdentitiesService.findByUserIdAndProvider(
      job.data.userId,
      IdentityProvider.SLACK,
    );

    if (!slackIdentity) {
      await this.preferencesRepository.incrementReminderFailure(
        reminder.id,
        'No Slack identity mapping found for user',
      );

      throw new Error('No Slack identity mapping found for user');
    }

    try {
      await this.slackReminderService.sendMissingPreferenceReminder(
        slackIdentity.providerUserId,
        job.data.date,
      );

      await this.preferencesRepository.markReminderSent(reminder.id);

      this.logger.traceJobEnd(
        job.name,
        BASE_QUEUE_NAMES.PREFERENCE_REMINDER,
        String(job.id),
        correlationId,
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown reminder failure';

      await this.preferencesRepository.incrementReminderFailure(reminder.id, errorMessage);

      this.logger.traceJobFailure(
        job.name,
        BASE_QUEUE_NAMES.PREFERENCE_REMINDER,
        String(job.id),
        errorMessage,
        correlationId,
      );

      throw error;
    }
  }
}
