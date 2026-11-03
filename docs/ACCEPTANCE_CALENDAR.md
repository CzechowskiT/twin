# Acceptance Calendar — Epic 1.4 Evidence

**Epic:** 1.4 Acceptance Calendar and Career Execution Planning  
**Branch:** `cursor/phase1-monorepo-scaffold`  
**Alembic:** `110_acceptance_calendar`

## Product

Internal **calendar of acceptance** aggregating interviews, applications, goals, reminders, learning into Today/Agenda/Week/Unscheduled views with time budget, feasibility, conflicts, proposed holds, ICS export. Microsoft write remains **OFF**; Graph is read-only / synthetic adapter when no credential.

## Key paths

| Layer | Path |
|-------|------|
| Service | `backend/app/services/acceptance_calendar.py` |
| API | `backend/app/api/acceptance_calendar.py` → `/api/v1/candidates/me/acceptance-calendar*` |
| FE | `frontend/src/components/career/acceptance-calendar-panel.tsx` + `/dashboard/acceptance` |
| Migration | `backend/alembic/versions/110_acceptance_calendar.py` |
| E2E | `scripts/acceptance-calendar-authenticated-e2e.py` |
| Tests | `backend/tests/test_acceptance_calendar.py` |

## Safety

- `microsoft_calendar_write_enabled` must stay false
- OAuth scopes sanitized — no `Calendars.ReadWrite` / Mail / Meetings write
- Holds: `external_created=false`; accept = internal schedule only
- ICS: no ATTENDEE / ORGANIZER
- No autonomous scheduling · Phase 3 Agent NOT_STARTED

## Tests

```bash
cd backend && python3 -m pytest tests/test_acceptance_calendar.py -q
OPS_ADMIN_TOKEN=… python3 scripts/acceptance-calendar-authenticated-e2e.py
```

## Production evidence (fill after deploy)

| Field | Value |
|-------|-------|
| `repo_head` | _(post-push)_ |
| `prod_frontend_commit` | |
| `prod_api_commit` | |
| `prod_worker_commit` | |
| `alignment_status` | |
| `alembic_current` | `110_acceptance_calendar` |
| `authenticated_e2e` | |
| `smoke_ci` | |
| `ms_write` | OFF |

## Stance

Launch NO-GO · Enrollment OFF · Phase 3B BLOCKED · MS write OFF · Phase 3 Agent NOT_STARTED · invite-only · invites 0 · synthetic ≠ real · candidate-first PRIMARY
