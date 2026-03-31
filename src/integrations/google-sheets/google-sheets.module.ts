import { Module } from '@nestjs/common';
import { CoreConfigModule } from '../../core/config/core-config.module';
import { CoreLoggerModule } from '../../core/logger/core-logger.module';
import { GoogleSheetsService } from './google-sheets.service';
import { GoogleSheetsAuthService } from './google-sheets-auth.service';
import { GoogleSheetsWriteService } from './google-sheets-write.service';

@Module({
  imports: [CoreConfigModule, CoreLoggerModule],
  providers: [GoogleSheetsService, GoogleSheetsAuthService, GoogleSheetsWriteService],
  exports: [GoogleSheetsService, GoogleSheetsWriteService],
})
export class GoogleSheetsModule {}
