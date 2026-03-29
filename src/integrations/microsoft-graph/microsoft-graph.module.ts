import { Module } from '@nestjs/common';
import { CoreConfigModule } from '../../core/config/core-config.module';
import { CoreLoggerModule } from '../../core/logger/core-logger.module';
import { MicrosoftGraphService } from './microsoft-graph.service';

@Module({
  imports: [CoreConfigModule, CoreLoggerModule],
  providers: [MicrosoftGraphService],
  exports: [MicrosoftGraphService],
})
export class MicrosoftGraphModule {}
