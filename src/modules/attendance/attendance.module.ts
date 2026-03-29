import { Module } from '@nestjs/common';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { AttendanceRepository } from './attendance.repository';
import { UsersModule } from '../users/users.module';
import { UserIdentitiesModule } from '../user-identities/user-identities.module';

@Module({
  imports: [UsersModule, UserIdentitiesModule],
  controllers: [AttendanceController],
  providers: [AttendanceService, AttendanceRepository],
  exports: [AttendanceService],
})
export class AttendanceModule {}
