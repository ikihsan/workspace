import { Module } from '@nestjs/common';
import { CoreConfigModule } from '../config/core-config.module';
import { CoreLoggerModule } from '../logger/core-logger.module';
import { QueueService } from './queue.service';

@Module({
  imports: [CoreConfigModule, CoreLoggerModule],
  providers: [QueueService],
  exports: [QueueService],
})
export class QueueModule {}
