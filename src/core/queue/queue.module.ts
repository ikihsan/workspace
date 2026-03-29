import { Module } from '@nestjs/common';
import { CoreConfigModule } from '../config/core-config.module';
import { QueueService } from './queue.service';

@Module({
  imports: [CoreConfigModule],
  providers: [QueueService],
  exports: [QueueService],
})
export class QueueModule {}
