import { Module } from '@nestjs/common';
import { CoreConfigModule } from '../../core/config/core-config.module';
import { CoreLoggerModule } from '../../core/logger/core-logger.module';
import { QueueModule } from '../../core/queue/queue.module';
import { AttendanceModule } from '../../modules/attendance/attendance.module';
import { UserIdentitiesModule } from '../../modules/user-identities/user-identities.module';
import { UsersModule } from '../../modules/users/users.module';
import { GoogleSheetsModule } from '../google-sheets/google-sheets.module';
import { SlackEventRetryWorker } from '../../workers/slack/slack-event-retry.worker';
import { AttendanceSheetsLogWorker } from '../../workers/slack/attendance-sheets-log.worker';
import { SlackController } from './slack.controller';
import { SlackService } from './slack.service';
import { SlackSignatureService } from './slack-signature.service';
import { SlackMessageParser } from './slack-message.parser';
import { SlackTimeResolver } from './slack-time.resolver';
import { SlackIdentityResolver } from './slack-identity.resolver';
import { SlackReminderService } from './slack-reminder.service';

@Module({
  imports: [
    CoreConfigModule,
    CoreLoggerModule,
    QueueModule,
    AttendanceModule,
    UsersModule,
    UserIdentitiesModule,
    GoogleSheetsModule,
  ],
  controllers: [SlackController],
  providers: [
    SlackService,
    SlackReminderService,
    SlackSignatureService,
    SlackMessageParser,
    SlackTimeResolver,
    SlackIdentityResolver,
    SlackEventRetryWorker,
    AttendanceSheetsLogWorker,
  ],
  exports: [SlackReminderService],
})
export class SlackModule {}
