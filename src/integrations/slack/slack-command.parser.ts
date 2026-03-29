import { Injectable } from '@nestjs/common';
import { AttendanceEventType } from '@prisma/client';

@Injectable()
export class SlackCommandParser {
  parse(message: string): AttendanceEventType | null {
    const normalized = message.trim().toLowerCase();

    switch (normalized) {
      case 'start':
        return AttendanceEventType.START;
      case 'break':
        return AttendanceEventType.BREAK;
      case 'resume':
        return AttendanceEventType.RESUME;
      case 'stop':
        return AttendanceEventType.STOP;
      default:
        return null;
    }
  }
}
