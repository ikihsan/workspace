import { Injectable } from '@nestjs/common';
import { AttendanceEventType } from '@prisma/client';

export interface ParsedSlackMessage {
  intent: AttendanceEventType;
  extractedTime: string | null;
  originalText: string;
}

const PATTERNS: { pattern: RegExp; intent: AttendanceEventType }[] = [
  {
    pattern: /^(?:work\s+)?start(?:\s+(?:at|@)\s*(.+))?$/i,
    intent: AttendanceEventType.START,
  },
  {
    pattern: /^(?:resume|(?:break|lb)\s+over)(?:\s+(?:at|@)\s*(.+))?$/i,
    intent: AttendanceEventType.RESUME,
  },
  {
    pattern: /^(?:break|lb)(?:\s+(?:at|@)\s*(.+))?$/i,
    intent: AttendanceEventType.BREAK,
  },
  {
    pattern: /^(?:work\s+)?stop(?:\s+(?:at|@)\s*(.+))?$/i,
    intent: AttendanceEventType.STOP,
  },
];

@Injectable()
export class SlackMessageParser {
  parse(message: string): ParsedSlackMessage | null {
    const trimmed = message.trim();
    if (!trimmed) {
      return null;
    }

    for (const { pattern, intent } of PATTERNS) {
      const match = trimmed.match(pattern);
      if (match) {
        return {
          intent,
          extractedTime: match[1]?.trim() || null,
          originalText: trimmed,
        };
      }
    }

    return null;
  }
}
