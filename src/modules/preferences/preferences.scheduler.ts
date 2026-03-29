import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { CronJob } from 'cron';
import { AppConfigService } from '../../core/config/app-config.service';
import { AppLogger } from '../../core/logger/app-logger.service';
import { PreferencesService } from './preferences.service';

@Injectable()
export class PreferencesScheduler implements OnModuleInit, OnModuleDestroy {
  private job: CronJob | null = null;

  constructor(
    private readonly appConfigService: AppConfigService,
    private readonly preferencesService: PreferencesService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(PreferencesScheduler.name);
  }

  onModuleInit(): void {
    this.job = new CronJob(
      this.appConfigService.scheduler.preferenceSyncCron,
      async () => {
        await this.runScheduledSync();
      },
      null,
      true,
      this.appConfigService.scheduler.preferenceSyncTimezone,
    );

    this.logger.info('Preference scheduler initialized', {
      module: 'preferences',
      cron: this.appConfigService.scheduler.preferenceSyncCron,
      timezone: this.appConfigService.scheduler.preferenceSyncTimezone,
    });
  }

  onModuleDestroy(): void {
    if (this.job) {
      this.job.stop();
    }
  }

  private async runScheduledSync(): Promise<void> {
    try {
      const result = await this.preferencesService.runDailySync();

      this.logger.info('Scheduled preference sync completed', {
        module: 'preferences',
        ...result,
      });
    } catch (error: unknown) {
      this.logger.error('Scheduled preference sync failed', {
        module: 'preferences',
        error: error instanceof Error ? error.message : 'Unknown scheduler error',
      });
    }
  }
}
