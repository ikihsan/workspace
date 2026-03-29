import { Body, Controller, Post } from '@nestjs/common';
import { AttendanceEventResult, AttendanceService } from './attendance.service';
import { ProcessAttendanceEventDto } from './dto/process-attendance-event.dto';

@Controller('internal/attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('events')
  processEvent(
    @Body() processAttendanceEventDto: ProcessAttendanceEventDto,
  ): Promise<AttendanceEventResult> {
    return this.attendanceService.processEvent(processAttendanceEventDto);
  }
}
