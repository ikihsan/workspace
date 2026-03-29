import { Module } from '@nestjs/common';
import { CoreLoggerModule } from '../../core/logger/core-logger.module';
import { QueueModule } from '../../core/queue/queue.module';
import { AzureOpenAiModule } from '../../integrations/azure-openai';
import { AttendanceModule } from '../attendance/attendance.module';
import { MeetingsModule } from '../meetings/meetings.module';
import { PreferencesModule } from '../preferences/preferences.module';
import { AiAgentController } from './ai-agent.controller';
import { AiAgentService } from './ai-agent.service';

@Module({
  imports: [
    CoreLoggerModule,
    QueueModule,
    AzureOpenAiModule,
    AttendanceModule,
    MeetingsModule,
    PreferencesModule,
  ],
  controllers: [AiAgentController],
  providers: [AiAgentService],
  exports: [AiAgentService],
})
export class AiAgentModule {}
