---
description: Describe when these instructions should be loaded
# applyTo: 'Describe when these instructions should be loaded' # when provided, instructions will automatically be added to the request context when the pattern matches an attached file
---
PROJECT CONTEXT
--------------------------------------------------
This project is a production-grade AI HR Operations Assistant.

Core capabilities:
- Track employee attendance via Slack messages (start, break, resume, stop)
- Automate daily user preferences (tea/coffee) using Google Sheets
- Send reminders via Slack when preferences are missing
- Schedule meetings using Microsoft Teams (Graph API)
- Use AI (Azure OpenAI) for natural language command parsing
- Provide reports and insights on activity

This is NOT a prototype.
This system must be scalable, reliable, and production-ready.

--------------------------------------------------
TECH STACK (MANDATORY)
--------------------------------------------------
- Backend: NestJS (modular architecture)
- Language: TypeScript (strict mode)
- Database: PostgreSQL with Prisma ORM
- Queue/Cache: Redis with BullMQ
- AI: Azure OpenAI
- Logging: pino (structured logging)
- Validation: class-validator DTOs
- Config: environment-based (ConfigModule)

--------------------------------------------------
ARCHITECTURE GUIDELINES
--------------------------------------------------
- Use modular monolith architecture

Structure:
- /modules → business logic (attendance, meetings, preferences, notifications, ai-agent)
- /integrations → external APIs (slack, google, microsoft)
- /core → shared utilities (logger, config, errors, retry, queue)

Follow clean architecture:
controller → service → repository

Rules:
- Controllers handle HTTP/events only
- Services contain business logic
- Repositories handle database access
- Integrations must NOT contain business logic
- Keep modules isolated and testable

--------------------------------------------------
CODING STANDARDS
--------------------------------------------------
- Use strict TypeScript typing (no any)
- Use DTOs for all inputs
- Validate using class-validator
- Avoid duplication (DRY)
- Keep functions small and focused
- Prefer readability over cleverness
- Write modular, reusable code

--------------------------------------------------
DATABASE GUIDELINES
--------------------------------------------------
- Use Prisma ORM
- Normalize schema design
- Define proper relations (foreign keys)
- Add indexes for frequently queried fields
- Use transactions where necessary
- Avoid redundant or derived fields unless justified

--------------------------------------------------
INTEGRATION RULES (CRITICAL)
--------------------------------------------------
Applies to:
- Slack API
- Google Sheets API
- Microsoft Graph API
- Azure OpenAI

For EVERY external call:

1. Retry:
   - Minimum 3 attempts
   - Exponential backoff

2. Fallback:
   If failure persists:
   - Push job to Redis queue (BullMQ)
   - Log structured error
   - Notify user if required

3. Idempotency:
   - Prevent duplicate processing (especially Slack events)

4. Rate Limits:
   - Respect API limits
   - Implement throttling if needed

System must NEVER crash due to external API failure.

--------------------------------------------------
REDIS & QUEUE GUIDELINES
--------------------------------------------------
- Use BullMQ for background jobs
- Use queues for:
  - retries
  - failed API calls
  - scheduled tasks

- Separate producers and workers
- Ensure jobs are retryable and idempotent

--------------------------------------------------
AI USAGE GUIDELINES
--------------------------------------------------
- AI is assistive, NOT authoritative

Use AI only for:
- intent parsing
- natural language interpretation

Rules:
- Always validate AI output
- Always provide deterministic fallback logic
- Never allow AI to directly trigger critical actions without validation

Example:
If AI fails → fallback to rule-based parsing

--------------------------------------------------
LOGGING & MONITORING
--------------------------------------------------
- Use structured logging (pino)
- Log:
  - incoming requests/events
  - external API calls
  - errors and retries

- Include context in logs (userId, action, module)

- Never log sensitive data (tokens, secrets)

--------------------------------------------------
ERROR HANDLING
--------------------------------------------------
- Use global exception filters (NestJS)
- Standardize error responses
- Do not expose internal errors to users
- Log all errors with context

--------------------------------------------------
SECURITY GUIDELINES
--------------------------------------------------
- Use OAuth for integrations (Slack, Google, Microsoft)
- Store tokens securely (env or vault)
- Validate all incoming requests
- Verify Slack signatures
- Sanitize inputs

--------------------------------------------------
TESTING GUIDELINES (RECOMMENDED)
--------------------------------------------------
- Write unit-testable services
- Mock external APIs
- Cover edge cases
- Ensure critical flows are tested

--------------------------------------------------
GIT & COMMIT STANDARDS
--------------------------------------------------
- Keep commits small and focused
- One feature per commit

Format:
feat(module): description
fix(module): description
refactor(module): description

Examples:
feat(attendance): add start/break tracking
feat(slack): handle event parsing
fix(meetings): retry on API failure

--------------------------------------------------
PERFORMANCE & SCALABILITY
--------------------------------------------------
- Avoid blocking operations
- Use async processing where possible
- Cache frequently accessed data (Redis)
- Optimize DB queries
- Design for horizontal scalability

--------------------------------------------------
DEVELOPMENT BEHAVIOR RULES
--------------------------------------------------
- Do NOT generate full system at once
- Always think before implementing
- Always identify edge cases
- Always include retries and fallbacks
- Always review code for production readiness

--------------------------------------------------
MISSION MINDSET
--------------------------------------------------
This system must behave like a real-world production service.

Every feature must:
- handle failures gracefully
- be maintainable long-term
- integrate cleanly with other modules

Do not optimize for speed of coding.
Optimize for correctness, reliability, and clarity.