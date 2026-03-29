import { Module } from '@nestjs/common';
import { CoreConfigModule } from '../../core/config/core-config.module';
import { CoreLoggerModule } from '../../core/logger/core-logger.module';
import { QueueModule } from '../../core/queue/queue.module';
import { MicrosoftGraphModule } from '../../integrations/microsoft-graph';
import { UserIdentitiesModule } from '../user-identities/user-identities.module';
import { UsersModule } from '../users/users.module';
import { MeetingsController } from './meetings.controller';
import { MeetingsRepository } from './meetings.repository';
import { MeetingsService } from './meetings.service';
import { MeetingCreateRetryWorker } from '../../workers/meetings/meeting-create-retry.worker';

@Module({
  imports: [
    CoreConfigModule,
    CoreLoggerModule,
    QueueModule,
    UsersModule,
    UserIdentitiesModule,
    MicrosoftGraphModule,
  ],
  controllers: [MeetingsController],
  providers: [MeetingsRepository, MeetingsService, MeetingCreateRetryWorker],
  exports: [MeetingsService],
})
export class MeetingsModule {}
