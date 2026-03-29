# Integration Contracts

## Boundaries
- `src/integrations/slack`: inbound events, outbound Slack messaging.
- `src/integrations/google-sheets`: preference data read contracts.
- `src/integrations/microsoft-graph`: Teams meeting lifecycle contracts.
- `src/integrations/azure-openai`: intent parsing only with deterministic fallback trigger points.

## Rules
- Integrations are adapter-only and must not contain business rules.
- All calls must support retries, backoff, and fallback enqueue behavior.
- All integration errors must emit structured logs with correlation metadata.

## Current Status
- Slack attendance ingress is implemented with deterministic command parsing and signature verification.
- Google Sheets preference ingest is implemented with deterministic row mapping.
- Slack outbound reminder sending is implemented for missing daily preferences.
- Microsoft Graph meeting creation is implemented with token caching/refresh and retry handling.
- Azure OpenAI integration remains pending.

## Slack Documentation
- Detailed Slack contract and flow are documented in `docs/integrations-slack.md`.
