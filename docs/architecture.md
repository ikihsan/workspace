# AI HR Operations Assistant - Architecture

## System Overview
- Backend is a NestJS modular monolith prepared for production use.
- Phase 1 provides infrastructure, Phase 2 adds identity and user mapping, Phase 3 adds attendance domain logic, Phase 4 adds Slack attendance ingress, Phase 5 adds preference automation orchestration, Phase 6 adds Microsoft Teams meeting scheduling, and Phase 7 adds AI intent parsing and routing.
- Core responsibilities implemented: typed config, logging/tracing, error normalization, persistence and queue infrastructure, health endpoint.
- Runtime now includes graceful shutdown hooks and dependency readiness checks (PostgreSQL + Redis).

## Module Structure
- `src/core`
  - `config`: environment parsing/validation and typed configuration access.
  - `logger`: pino-based structured logging wrapper with request/job trace metadata.
  - `correlation`: correlation ID middleware + request tracing interceptor + async request context.
  - `errors`: global exception filter with standardized API error shape.
  - `prisma`: Prisma client lifecycle management.
  - `redis`: shared Redis client lifecycle management.
  - `queue`: BullMQ global config + queue abstraction service.
- `src/modules`
  - `health`: readiness endpoint with dependency checks and degraded-state signaling.
  - `users`: internal CRUD for user records and lookup by email/provider identity.
  - `user-identities`: provider identity mapping (`slack`, `google`, `microsoft`) to internal users.
  - `attendance`: session/event state machine for `start`, `break`, `resume`, `stop` with idempotency and transactional consistency.
  - `preferences`: daily preference sync, missing preference detection, reminder queue orchestration.
  - `meetings`: deterministic request validation, Microsoft meeting orchestration, and persistence.
  - `ai-agent`: natural language command parsing (AI assist + deterministic fallback), schema validation, and safe routing.
- `src/integrations`
  - `slack`: verified inbound event handling with deterministic command mapping for attendance.
  - `google-sheets`: deterministic sheet reader for preference rows.
  - `microsoft-graph`: Teams meeting creation adapter with token lifecycle handling.
  - `azure-openai`: assistive intent parser returning strict JSON shape for downstream validation.
- `src/workers`
  - Base worker contracts for queue jobs.

## Integration Boundaries (Planned)
- All external systems must be accessed through `src/integrations/*` adapters.
- Business orchestration lives under `src/modules/*` and depends on integration interfaces, not SDK details.
- Queue workers consume typed payloads and call module services; workers never hold domain rules directly.

## Identity Mapping Boundaries
- User identity resolution is internal only in Phase 2 (no external provider API calls).
- `users` owns canonical profile data (`email`, `name`, `timezone`, `status`).
- `user-identities` owns external-to-internal linkage and uniqueness (`provider + providerUserId`).
- External integration modules must depend on this mapping layer for user resolution.

## Data Flow Summary
1. Request arrives -> correlation ID injected or propagated.
2. Request tracing interceptor logs ingress/egress with correlation ID.
3. Controllers/services execute (currently only health path).
4. Exceptions are normalized by global exception filter.
5. Async/background work is scheduled through QueueService with BullMQ defaults and trace metadata propagation.
6. Redis and Prisma connections are shared through injectable core services.
7. Shutdown signals are handled through Nest shutdown hooks for clean resource teardown.

## Identity Data Flow Summary (Phase 2)
1. Internal client creates/updates a canonical user.
2. Internal client maps an external identity to the user (`provider`, `providerUserId`, `metadata`).
3. Service validates user existence, normalizes inputs, and enforces uniqueness.
4. Future Slack/Google/Microsoft adapters resolve users through identity lookup before business actions.

## Attendance Data Flow Summary (Phase 3)
1. Internal attendance event enters with either `userId` or (`provider`, `providerUserId`) and `idempotencyKey`.
2. Attendance module resolves canonical user through identity mapping when provider identity is used.
3. Work date is derived from event UTC timestamp converted to user timezone.
4. A serializable transaction validates current session/event state, applies transition, and stores event.
5. Duplicate events are deduplicated by `idempotencyKey`; concurrent conflicts are retried safely.

## Slack Ingress Data Flow Summary (Phase 4)
1. Slack event callback reaches `/integrations/slack/events` with signature headers.
2. Integration verifies signature + replay window using raw request body.
3. Message text is deterministically mapped to attendance commands (`start`, `break`, `resume`, `stop`).
4. Slack `event_id` is passed as idempotency key and Slack user id is resolved through identity mapping.
5. Attendance service executes domain transition; failures are queued for retry in `slack-event-retry`.

## Preference Automation Flow (Phase 5)
1. Scheduler triggers daily preference sync.
2. Google Sheets integration fetches and normalizes user preference rows by email.
3. Preferences module maps rows to users and upserts daily preference records.
4. Active users missing preferences are identified deterministically.
5. Reminder jobs are queued to `preference-reminder` and dispatched via Slack identity mapping.

## Meeting Scheduling Flow (Phase 6)
1. Internal meeting request is submitted with structured scheduling fields.
2. Meetings module validates organizer/participants and Microsoft identity mappings.
3. Microsoft Graph integration creates Teams online meeting and returns external id/join URL.
4. Request and meeting metadata are persisted transactionally-safe at module level.
5. Failures are retried through `meeting-create-retry`, then dead-lettered after max attempts.

## AI Intent Routing Flow (Phase 7)
1. Natural-language command is posted to internal AI agent endpoint with user context.
2. Azure OpenAI parses intent to structured JSON (`action`, `parameters`) with retries.
3. AI output is schema-validated and normalized before any execution path.
4. On AI parse failure/invalid response, deterministic fallback parser derives intent.
5. Intent is routed to attendance/meetings/preferences services only after validation.
6. AI failures are enqueued to `system-retry` for operational visibility.
