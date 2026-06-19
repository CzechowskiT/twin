# Audit Event Foundation — 2026-06-18

**Branch:** `backend/audit-event-foundation-2026-06-18`  
**Route:** `/board/audit-event-foundation`  
**API:** `GET/POST /api/v1/audit-events`

## Purpose

First safe backend persistence foundation: append-only `AuditEvent` records with persona auth on writes. No update/delete. No external side effects.

## Data model

| Field | Type | Notes |
| ----- | ---- | ----- |
| `id` | int | Auto |
| `event_type` | string | Allowlisted |
| `actor_persona` | string | candidate \| recruiter \| company \| board \| system |
| `actor_id` | string | Authenticated user id on POST |
| `target_type` | string | Allowlisted |
| `target_id` | string | Scoped identifier |
| `metadata_json` | text | Sanitized key/value |
| `source` | string | Always `twin_internal` |
| `external_side_effect` | bool | Always `false` |
| `created_at` | datetime | Append-only timestamp |

Migration: `060_audit_events_foundation`

## Safety boundaries

- Append-only — no PUT/PATCH/DELETE routes
- Auth required on GET and POST
- No email, ATS, outreach, or legal compliance hooks
- Metadata strips PII/forbidden keys
- Internal write only — not live externally

## Not live

- No outbound email or calendar
- No ATS writeback
- No legal compliance claims
- No automatic decisions

## Tests

```bash
cd backend && pytest tests/test_audit_events_foundation.py -q
cd frontend && npm run test:audit-event-foundation
npm run build
```

Prod smoke (optional browser):

```bash
PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app npm run test:audit-event-foundation-browser
```

## Rollback

Drop migration `060_audit_events_foundation` or leave table unused; remove router include from `backend/app/api/router.py`.

## Rollout status

**PILOT** — safe internal persistence foundation. Public launch **NO-GO**.
