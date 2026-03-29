# AI Agent Module

## Purpose
Provide an assistive natural-language layer that converts text commands into validated intent objects and safely routes execution to core business modules.

## Scope
- Accept natural language command input.
- Parse command intent using Azure OpenAI (`action`, `parameters`).
- Validate AI output schema and normalize parameters.
- Fallback to deterministic parser when AI parsing fails.
- Route validated intent to attendance, meetings, or preferences service.

## Routing Targets
- Attendance:
  - Supported natural expressions: start, break, resume, stop.
  - Executes through `AttendanceService.processEvent`.
- Meetings:
  - Routes structured request through `MeetingsService.createMeetingRequest`.
  - Requires validated scheduling fields before execution.
- Preferences:
  - Routes tea/coffee preferences through `PreferencesService.setDailyPreferenceFromIntent`.

## Reliability
- Azure OpenAI calls use 3-attempt exponential retry.
- AI parse errors or invalid schema responses enqueue `ai-intent-parse-failure` to `system-retry` queue.
- Deterministic fallback parser preserves continuity during AI failures.

## Safety Rules
- AI does not execute actions directly.
- AI output is non-authoritative and always validated.
- Only validated and normalized intents are routed to business modules.
- All AI interactions are logged with structured metadata (excluding secrets).
