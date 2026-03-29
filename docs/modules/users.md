# Users and Identity Mapping Module

## Purpose
Provide the canonical user record and a durable identity mapping layer across external providers.

## Scope (Phase 2)
- Internal user CRUD only.
- Internal identity mapping CRUD only.
- No external Slack/Google/Microsoft API calls.

## Responsibilities
- `users` module:
  - Manage canonical user fields: `id`, `email`, `name`, `timezone`, `status`.
  - Provide lookup by email.
  - Provide lookup by Slack identity through mapped provider keys.
- `user-identities` module:
  - Map provider identities (`SLACK`, `GOOGLE`, `MICROSOFT`) to internal `userId`.
  - Persist optional identity metadata (`JSON`).
  - Guarantee uniqueness of `provider + providerUserId`.

## Data Model
- `users`
  - Unique: `email`
  - Index: `status`
- `user_identities`
  - Unique: `(provider, providerUserId)`
  - Relation: `userId -> users.id`
  - Index: `userId`

## Validation and Constraints
- Email is normalized to lowercase and trimmed.
- Provider values are normalized to uppercase enum values.
- Provider user IDs are trimmed.
- DTO validation enforces required fields and shape.
- Services convert Prisma unique constraint errors into conflict responses.

## Edge Cases Handled
- Duplicate email creation/update.
- Duplicate provider identity mapped to different users.
- Identity creation for missing users.
- Missing user on internal lookups/deletes.

## Future Integration Readiness
- Integrations must resolve actor identity through `user-identities` first.
- Metadata column supports provider-specific payload extensions without schema churn.
- Service boundaries keep external API adapters decoupled from core user records.
