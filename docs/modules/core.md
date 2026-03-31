# Core Module Notes

## Purpose
Provide shared runtime capabilities required by all future modules.

## Responsibilities
- Typed environment config and validation.
- Correlation and request tracing.
- Structured logging with pino.
- Global exception normalization.
- Prisma/Redis lifecycle management.
- BullMQ queue bootstrap and enqueue abstraction.

## Boot Requirements
- Core boot requires PostgreSQL and Redis connectivity plus queue/scheduler configuration.
- Third-party integration credentials (Slack/Google/Microsoft/Azure) are optional for startup and validated at feature execution boundaries.

## Important Constraints
- No domain business logic in core.
- Keep abstractions generic and reusable.
- Preserve strict typing across all public interfaces.
