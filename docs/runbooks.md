# Runbooks (Foundation)

## Startup Checks
1. Validate required environment variables against Zod schema.
2. Ensure PostgreSQL is reachable from `DATABASE_URL`.
3. Ensure Redis is reachable from `REDIS_HOST`/`REDIS_PORT`.
4. Verify `/health` returns `status=ok` with `checks.postgres.status=up` and `checks.redis.status=up`.

## Failure Handling Baseline
- HTTP errors are standardized by the global exception filter.
- Correlation ID is returned in response headers and error bodies.
- Queue defaults enforce retry attempts and exponential backoff.
- Queue payloads carry trace correlation metadata for downstream job logging.

## Slack Retry Worker
- Queue: `slack-event-retry`
- Worker reprocesses failed Slack attendance events using deterministic command mapping.
- Retry strategy:
	- max retry attempts: 3
	- exponential delays based on queue backoff base (`QUEUE_BACKOFF_MS`)
- On every retry scheduling event, emit structured warning log with attempt metadata.
- On final failure, move payload to `dead-letter` queue and emit critical error log.

## Dead-Letter Handling (Slack)
1. Inspect dead-letter jobs with `jobName=dead-letter-slack-attendance-event`.
2. Validate root cause from `finalError` and mapped user identity state.
3. Replay corrected event into `slack-event-retry` only after root cause mitigation.
4. Preserve original `event_id` semantics to maintain attendance idempotency safety.

## Preference Sync Operations
- Scheduler triggers daily sync using `PREFERENCE_SYNC_CRON` and `PREFERENCE_SYNC_TIMEZONE`.
- Google Sheets ingestion retries up to 3 times with exponential backoff.
- Missing-preference reminders are queued to `preference-reminder`.

## Preference Reminder Failure Handling
1. Inspect failed jobs in `preference-reminder` queue.
2. Check reminder record status/attempt count in `reminders` table.
3. Validate Slack identity mapping exists for target user.
4. Requeue only after root cause mitigation to avoid repeated failed sends.

## Meeting Creation Retry Handling
- Primary retry queue: `meeting-create-retry`
- Worker retry policy:
	- max retries: 3
	- exponential delay from `QUEUE_BACKOFF_MS`
- On exhausted retries:
	- request status marked `FAILED`
	- payload moved to `dead-letter` queue (`jobName=dead-letter-meeting-create`)

## Meeting Failure Recovery
1. Inspect `meeting_requests.failureReason` and dead-letter payload context.
2. Verify organizer and participants still have Microsoft identity mappings.
3. Validate Microsoft Graph app credentials and permission scopes.
4. Replay request only after root-cause remediation.

## Operational Notes
- Use correlation ID for tracing logs per request.
- Do not log credentials, tokens, or secret values.
- Dead-letter and replay workflows will be added in the next phases.
- During shutdown/redeploy, rely on Nest shutdown hooks for clean resource teardown.
