import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import { AppLogger } from '../../core/logger/app-logger.service';

const TIME_PATTERN = /^(\d{1,2}):(\d{2})\s*(am|pm)?$/i;

@Injectable()
export class SlackTimeResolver {
  constructor(private readonly logger: AppLogger) {
    this.logger.setContext(SlackTimeResolver.name);
  }

  resolve(
    extractedTime: string | null,
    slackEventTs: string | undefined,
    userTimezone: string,
  ): string | undefined {
    if (extractedTime) {
      const parsed = this.parseTime(extractedTime);
      if (parsed) {
        const resolved = this.buildTimestamp(parsed.hours, parsed.minutes, parsed.hasMeridiem, userTimezone);
        if (resolved) {
          this.logger.debug('Resolved user-provided time', {
            integration: 'slack',
            extractedTime,
            resolvedTimestamp: resolved,
            userTimezone,
          });
          return resolved;
        }
      }

      this.logger.warn('Failed to parse user-provided time; falling back to event timestamp', {
        integration: 'slack',
        extractedTime,
      });
    }

    return this.toIsoTimestamp(slackEventTs);
  }

  private parseTime(timeStr: string): { hours: number; minutes: number; hasMeridiem: boolean } | null {
    const match = timeStr.trim().match(TIME_PATTERN);
    if (!match) {
      return null;
    }

    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const meridiem = match[3]?.toLowerCase();
    const hasMeridiem = Boolean(meridiem);

    if (minutes < 0 || minutes > 59) {
      return null;
    }

    if (meridiem) {
      if (hours < 1 || hours > 12) {
        return null;
      }
      if (meridiem === 'pm' && hours !== 12) {
        hours += 12;
      }
      if (meridiem === 'am' && hours === 12) {
        hours = 0;
      }
    } else {
      if (hours < 0 || hours > 23) {
        return null;
      }
    }

    return { hours, minutes, hasMeridiem };
  }

  private buildTimestamp(hours: number, minutes: number, hasMeridiem: boolean, timezone: string): string | null {
    const now = DateTime.now().setZone(timezone);
    if (!now.isValid) {
      return null;
    }

    let resolved = now.set({ hour: hours, minute: minutes, second: 0, millisecond: 0 });

    // When no AM/PM given and the time is far in the past (>4h), assume PM
    // e.g. "5:30" at 3:51 PM → interpret as 17:30, not 05:30
    if (!hasMeridiem && hours >= 1 && hours <= 12) {
      const hoursBehind = now.diff(resolved, 'hours').hours;
      if (hoursBehind > 4) {
        const pmCandidate = now.set({ hour: hours + 12, minute: minutes, second: 0, millisecond: 0 });
        const pmHoursBehind = now.diff(pmCandidate, 'hours').hours;
        if (pmHoursBehind >= -1 && pmHoursBehind < 12) {
          this.logger.debug('Ambiguous time resolved to PM', {
            integration: 'slack',
            originalHour: hours,
            resolvedHour: hours + 12,
          });
          resolved = pmCandidate;
        }
      }
    }

    const maxFuture = DateTime.now().setZone(timezone).plus({ hours: 1 });
    if (resolved > maxFuture) {
      this.logger.warn('User-provided time is too far in the future; rejecting', {
        integration: 'slack',
        resolvedLocal: resolved.toISO(),
        maxFutureLocal: maxFuture.toISO(),
      });
      return null;
    }

    return resolved.toUTC().toISO();
  }

  private toIsoTimestamp(slackEventTs: string | undefined): string | undefined {
    if (!slackEventTs) {
      return undefined;
    }

    const seconds = Number(slackEventTs);
    if (!Number.isFinite(seconds)) {
      return undefined;
    }

    return new Date(seconds * 1000).toISOString();
  }
}
