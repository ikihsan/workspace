import { Module } from '@nestjs/common';
import { CoreConfigModule } from '../../core/config/core-config.module';
import { CoreLoggerModule } from '../../core/logger/core-logger.module';
import { QueueModule } from '../../core/queue/queue.module';
import { GoogleSheetsModule } from '../../integrations/google-sheets/google-sheets.module';
import { SlackModule } from '../../integrations/slack/slack.module';
import { UserIdentitiesModule } from '../user-identities/user-identities.module';
import { UsersModule } from '../users/users.module';
import { PreferencesRepository } from './preferences.repository';
import { PreferencesScheduler } from './preferences.scheduler';
import { PreferencesService } from './preferences.service';
import { PreferenceReminderWorker } from '../../workers/preferences/preference-reminder.worker';

@Module({
  imports: [
    CoreConfigModule,
    CoreLoggerModule,
    QueueModule,
    UsersModule,
    UserIdentitiesModule,
    GoogleSheetsModule,
    SlackModule,
  ],
  providers: [
    PreferencesRepository,
    PreferencesService,
    PreferencesScheduler,
    PreferenceReminderWorker,
  ],
  exports: [PreferencesService],
})
export class PreferencesModule {}
