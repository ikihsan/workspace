import { Module } from '@nestjs/common';
import { CoreConfigModule } from '../../core/config/core-config.module';
import { CoreLoggerModule } from '../../core/logger/core-logger.module';
import { QueueModule } from '../../core/queue/queue.module';
import { AttendanceModule } from '../../modules/attendance/attendance.module';
import { SlackEventRetryWorker } from '../../workers/slack/slack-event-retry.worker';
import { SlackController } from './slack.controller';
import { SlackService } from './slack.service';
import { SlackSignatureService } from './slack-signature.service';
import { SlackCommandParser } from './slack-command.parser';
import { SlackReminderService } from './slack-reminder.service';

@Module({
  imports: [CoreConfigModule, CoreLoggerModule, QueueModule, AttendanceModule],
  controllers: [SlackController],
  providers: [
    SlackService,
    SlackReminderService,
    SlackSignatureService,
    SlackCommandParser,
    SlackEventRetryWorker,
  ],
  exports: [SlackReminderService],
})
export class SlackModule {}
