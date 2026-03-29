import { Module } from '@nestjs/common';
import { CoreConfigModule } from '../../core/config/core-config.module';
import { CoreLoggerModule } from '../../core/logger/core-logger.module';
import { GoogleSheetsService } from './google-sheets.service';

@Module({
  imports: [CoreConfigModule, CoreLoggerModule],
  providers: [GoogleSheetsService],
  exports: [GoogleSheetsService],
})
export class GoogleSheetsModule {}
