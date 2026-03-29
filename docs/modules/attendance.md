# Attendance Module

## Purpose
Track attendance sessions using deterministic state transitions and strict idempotency.

## Supported Events
- `START`
- `BREAK`
- `RESUME`
- `STOP`

## Session Lifecycle
- `START` creates an open session for the user/day.
- `BREAK` marks an active break within an open session.
- `RESUME` ends break and increments accumulated break seconds.
- `STOP` closes the session.

## Core Constraints
- Only one active session per user per work date.
- Invalid sequences are rejected:
  - break before start
  - resume without break
  - stop before start
  - stop while break is active
  - multiple starts for same day

## Time & Timezone Rules
- All timestamps are stored in UTC (`DateTime` in DB).
- Work date is derived from event timestamp converted to user timezone.
- Session metrics are computed as:
  - `totalBreakSeconds`: accumulated break time (+ active break window when open)
  - `totalWorkSeconds`: elapsed session time minus total break time

## Reliability & Consistency
- State updates execute in serializable DB transactions.
- Idempotency enforced by unique `idempotencyKey` on attendance events.
- Retry strategy for transaction conflicts (`P2034`) to handle concurrent updates.
- Uniqueness constraints guard session integrity at the persistence layer.

## Identity Integration
- Events resolve user either by:
  - internal `userId`, or
  - mapped provider identity (`provider` + `providerUserId`).
- Attendance module depends on the existing identity mapping module; no external provider APIs are called.

## Database Models
- `attendance_sessions`
- `attendance_events`

Both are linked to canonical `users` records and indexed for timeline lookups.
