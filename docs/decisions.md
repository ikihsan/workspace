# Technical Decisions (Phase 1)

## 1) NestJS Modular Monolith
- **Decision:** Use NestJS with modular monolith boundaries (`core`, `modules`, `integrations`, `workers`).
- **Reason:** Clear dependency boundaries, strong DI, testability, and future extraction path if services split later.

## 2) Typed Environment Configuration
- **Decision:** Centralized config using `@nestjs/config` with Zod validation.
- **Reason:** Fail fast on invalid runtime configuration and avoid unsafe env access.

## 3) Structured Logging with pino
- **Decision:** Use `nestjs-pino` + application logger wrapper.
- **Reason:** High-performance structured logs, consistent metadata (correlation ID, trace type, job context).

## 4) Correlation-First Observability
- **Decision:** Add middleware + async request context + interceptor tracing.
- **Reason:** End-to-end traceability across request lifecycle and queue workflows.

## 5) Prisma for PostgreSQL Access
- **Decision:** Add Prisma service and lifecycle hooks now; defer schema/business models.
- **Reason:** Stable DB access abstraction from day one while preserving strict scope for Phase 1.

## 6) Redis + BullMQ Base Infrastructure
- **Decision:** Configure Redis client and BullMQ global settings with queue abstraction service.
- **Reason:** Standardized retries/backoff, future fallback jobs, and scheduled tasks.

## 7) Standardized Error Contract
- **Decision:** Global exception filter for uniform API error responses.
- **Reason:** Predictable client behavior and easier observability/incident response.

## 8) Graceful Shutdown by Default
- **Decision:** Enable Nest shutdown hooks in bootstrap.
- **Reason:** Ensures Redis/Prisma/queue resources are closed cleanly during deploys or restarts.

## 9) Dependency-Aware Health Endpoint
- **Decision:** Health endpoint performs PostgreSQL and Redis readiness probes and returns degraded state when needed.
- **Reason:** Prevents false-positive health responses and improves orchestrator behavior.

## 10) Queue Correlation + Idempotent Enqueue Support
- **Decision:** Queue abstraction auto-injects trace correlation metadata and supports idempotency key -> BullMQ jobId mapping.
- **Reason:** Enables request-to-job observability and safer retry behavior for future modules.

## 11) Preference Automation via Scheduled Orchestration
- **Decision:** Add a cron-driven preferences module that reads Google Sheets and evaluates daily missing preferences.
- **Reason:** Separates orchestration concerns from attendance core logic and keeps flows deterministic.

## 12) Deterministic Google Sheets Ingestion
- **Decision:** Use explicit email + preference row mapping with API retry and short cache.
- **Reason:** Improves resilience to transient API failures while avoiding non-deterministic parsing.

## 13) Reminder Delivery Through Queue Worker
- **Decision:** Send missing-preference reminders through dedicated queue worker and Slack outbound adapter.
- **Reason:** Decouples reminder I/O from scheduler execution and supports controlled retries/failure tracking.

## Trade-offs
- Added more foundational wiring now to reduce integration friction later.
- Chose explicit abstraction layers (config/logger/queue) to prioritize maintainability over minimal boot code.
