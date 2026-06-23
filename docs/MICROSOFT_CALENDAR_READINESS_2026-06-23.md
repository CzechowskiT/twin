# Microsoft Calendar OAuth Readiness — 2026-06-23

**Batch owner:** TWIN Microsoft Calendar Readiness (slices 2.1–2.5)  
**Base:** `cursor/phase1-monorepo-scaffold`  
**Mode:** frontend readiness preview — **no** calendar sync, Graph writes, invites, email, or token display

## Purpose

Ship cross-persona **readiness/preview** surfaces for Microsoft Graph calendar OAuth wiring before enabling live sync. Mirrors Google Calendar OAuth patterns and `public-health` `microsoft_calendar_configured` flag — without claiming connected accounts or created events.

## Domain model

| Artifact | Path |
|----------|------|
| Shared types + resolver | `frontend/src/lib/calendar-readiness.ts` |
| Demo data | `frontend/src/lib/calendar-readiness-demo-data.ts` |
| Test | `npm run test:calendar-readiness-domain` |

**Providers:** `google` (shipped), `microsoft` (readiness preview), `ics_webcal`, `apple_caldav`  
**Stages:** `not_started` → `oauth_env_preview` → `busy_read_preview` → `hold_write_blocked` → `readiness_preview`

## Surfaces (demo / preview)

| Persona | Route | Purpose |
|---------|-------|---------|
| Candidate | `/dashboard/calendar/readiness` | Microsoft OAuth readiness preview |
| Candidate (workspace) | `/dashboard/calendar` | Existing calendar workspace (unchanged behavior) |
| Recruiter | `/recruiter/daily-cockpit` | Scheduling proof panel (read-only) |
| Company | `/company/hiring-command-center` | Scheduling proof panel (read-only) |
| Board | `/board/calendar-readiness` | Cross-persona readiness monitor |

## Copy guardrails

**Allowed:** readiness, preview only, blocked, OAuth env preview, public-health flag, scheduling proof, no live sync.

**Forbidden:** calendar synced, event created, invite sent, microsoft calendar connected, google calendar connected, notification sent, email sent.

Enforced by slice tests + `npm run test:trust-language-guard`.

## Backend reference (read-only)

| Item | Location |
|------|----------|
| Microsoft OAuth service | `backend/app/services/microsoft_calendar_oauth.py` |
| public-health flag | `microsoft_calendar_configured` on `/api/public-health` and `/api/v1/health?ops=1` |
| Google pattern | `backend/app/api/calendar.py`, `docs/GOOGLE_CALENDAR_OAUTH_PROD_FIX_2026-05-29.md` |

**Do not** enable Graph event create/update/delete or recruiter sync in this batch.

## Tests (per slice)

```bash
cd frontend
npm run test:calendar-readiness-domain
npm run test:candidate-calendar-readiness
npm run test:recruiter-company-calendar-readiness
npm run test:board-calendar-readiness-monitor
npm run test:trust-language-guard
npm run test:i18n-coverage
npm run build
npx tsc --noEmit
```

**Browser smoke (after deploy):**

```bash
PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app \
  npm run test:board-calendar-readiness-monitor-browser
```

## Explicitly out of scope (hard bans)

- Calendar sync, Graph writes, event create/update/delete
- Invites, email, notifications, token display
- Phase 3B, multitab, stress, headless verification batches
- Placement events auth smoke re-run with exposed JWT — **fresh token required**

## Launch stance (unchanged)

| Gate | Status |
|------|--------|
| Microsoft calendar live sync | **NOT SHIPPED** — readiness preview only |
| Public launch | **NO-GO** |
| P0 performance | **OPEN** |
| Phase 3B | **HARD BLOCKED** |

## Related docs

- `docs/PLACEMENT_EVENTS_PROD_VERIFICATION_2026-06-23.md` — Part 1 auth smoke evidence
- `docs/RAILWAY_PROD_ENV_PL.md` — Microsoft Calendar Azure env
- `docs/GOOGLE_CALENDAR_OAUTH_PROD_FIX_2026-05-29.md` — Google OAuth pattern reference

## Next batch (not this slice)

When explicitly unblocked: Microsoft Graph busy read behind OAuth connect UI, hold write behind consent, ICS/WebCal subscribe parity checks — still no invite dispatch until product gate opens.
