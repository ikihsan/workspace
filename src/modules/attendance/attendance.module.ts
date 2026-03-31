import { Module } from '@nestjs/common';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { AttendanceRepository } from './attendance.repository';
import { UsersModule } from '../users/users.module';
import { UserIdentitiesModule } from '../user-identities/user-identities.module';
import { CoreLoggerModule } from '../../core/logger/core-logger.module';

@Module({
  imports: [UsersModule, UserIdentitiesModule, CoreLoggerModule],
  controllers: [AttendanceController],
  providers: [AttendanceService, AttendanceRepository],
  exports: [AttendanceService],
})
export class AttendanceModule {}
