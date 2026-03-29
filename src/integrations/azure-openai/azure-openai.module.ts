import { Module } from '@nestjs/common';
import { CoreConfigModule } from '../../core/config/core-config.module';
import { CoreLoggerModule } from '../../core/logger/core-logger.module';
import { AzureOpenAiService } from './azure-openai.service';

@Module({
  imports: [CoreConfigModule, CoreLoggerModule],
  providers: [AzureOpenAiService],
  exports: [AzureOpenAiService],
})
export class AzureOpenAiModule {}
