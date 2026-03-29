# Slack Integration (Phase 4)

## Purpose
Provide a reliable external entrypoint for attendance events from Slack, while keeping integration logic thin and deterministic.

## Inbound Endpoint
- `POST /integrations/slack/events`

## Security
- Verifies Slack signature using HMAC SHA256 (`x-slack-signature`) and request timestamp (`x-slack-request-timestamp`).
- Rejects requests outside replay window (`SLACK_SIGNATURE_MAX_AGE_SECONDS`).

## Event Handling
- Supports Slack `event_callback` envelopes with message events.
- Ignores non-message, bot, and subtype message events.
- Supports Slack URL verification challenge handshake.

## Deterministic Command Parsing
Normalized message text maps exactly to attendance commands:
- `start` -> `START`
- `break` -> `BREAK`
- `resume` -> `RESUME`
- `stop` -> `STOP`

Anything else is ignored (no AI/NLP).

## Identity Mapping
- Uses provider identity mapping: `provider = SLACK`, `providerUserId = event.user`.
- Attendance module resolves canonical internal user through existing user-identities module.

## Idempotency & Reliability
- Uses Slack `event_id` as attendance idempotency key.
- On processing failure, pushes payload to retry queue `slack-event-retry`.
- Retry worker behavior:
	- reprocesses failed events from `slack-event-retry`
	- max attempts: 3
	- exponential retry delay
	- after max failures, moves payload to `dead-letter` queue
- Logs every Slack envelope and processing outcome with correlation context.

## Integration Boundary
- Slack integration does not implement attendance business rules.
- Business state transitions remain in attendance service.
