# Meetings Module

## Purpose
Create Microsoft Teams meetings through Microsoft Graph using deterministic, validated input.

## Scope
- Accept structured meeting requests:
  - organizer user id
  - participant user ids
  - start time
  - duration minutes
  - title
- Validate user existence and Microsoft identity mappings.
- Create Teams online meeting and persist request/meeting records.

## Data Model
- `meeting_requests`
  - organizer user relation
  - participant ids payload
  - scheduling metadata
  - status lifecycle (`PENDING`, `CREATED`, `FAILED`)
  - failure reason tracking
- `meetings`
  - request relation (unique)
  - provider (`MICROSOFT_TEAMS`)
  - external meeting id (unique)
  - join url
  - metadata payload

## Reliability
- Immediate Graph creation with bounded retry in service.
- Failed creation attempts are queued to `meeting-create-retry`.
- Retry worker performs exponential backoff (max 3 attempts).
- After max failures:
  - request marked `FAILED`
  - payload moved to `dead-letter` queue.

## Token Handling
- Microsoft Graph client uses client-credentials token flow.
- Access token cached and refreshed on expiry/401 responses.

## Integration Boundaries
- Business validation and persistence remain in meetings module.
- Microsoft Graph integration stays adapter-only (API orchestration and token management).
- No AI/NLP logic.
