# Preferences Module

## Purpose
Automate daily tea/coffee preference ingestion and missing-preference reminders.

## Responsibilities
- Read Google Sheets preference rows (email + preference).
- Map rows to internal users using canonical email identity.
- Persist daily user preference values.
- Detect active users missing preferences for their local day.
- Enqueue Slack reminder jobs while preventing duplicate reminders per day.

## Data Model
- `preference_days`
  - unique: `(userId, date)`
  - fields: preference, source, remindedAt
- `reminders`
  - unique: `(userId, date, reminderType, channel)`
  - tracks status, attemptCount, errors, sentAt

## Scheduling
- Cron-driven daily sync using:
  - `PREFERENCE_SYNC_CRON`
  - `PREFERENCE_SYNC_TIMEZONE`

## Google Sheets Integration
- Reads range from configured spreadsheet via API key.
- Retries fetch failures (3 attempts, exponential backoff).
- Uses short in-memory cache (`GOOGLE_SHEETS_CACHE_TTL_SECONDS`).

## Reminder Delivery
- Missing users generate one reminder record per day.
- Reminder jobs are sent through `preference-reminder` queue.
- Worker resolves Slack identity from user-identities module and sends DM via Slack API.

## Reliability
- Duplicate reminders prevented by DB uniqueness constraint and idempotent queue keys.
- Reminder failures increment attempt count and keep failure metadata.
- Attendance/business logic is not modified by preferences orchestration.
