# Microsoft Graph Busy-Read Readiness — 2026-06-24

**Batch owner:** TWIN Microsoft Graph Busy-Read Readiness Layer  
**Base:** `cursor/phase1-monorepo-scaffold` @ c096128  
**Mode:** frontend readiness preview — **no** calendar sync, Graph writes, invites, email, or token display

## Purpose

Extend the existing calendar readiness batch (PRs #254–#260) with a **focused Microsoft Graph busy-read domain layer** that merges with shared `calendar-readiness.ts` without duplicating provider allowlists. Surfaces show busy-read preview stage, OAuth env flag, and blocked Graph writes — not connected accounts or created events.

## Domain model (new layer)

| Artifact | Path |
|----------|------|
| Microsoft busy-read types + resolver | `frontend/src/lib/microsoft-calendar-readiness.ts` |
| Microsoft demo data | `frontend/src/lib/microsoft-calendar-readiness-demo-data.ts` |
| Shared calendar types (unchanged) | `frontend/src/lib/calendar-readiness.ts` |
| Test | `npm run test:microsoft-calendar-readiness-domain` |

**Microsoft busy-read stages:** `not_started` → `oauth_env_preview` → `busy_read_preview` → `hold_write_blocked` → `readiness_preview`  
**Graph scopes (preview):** `offline_access`, `User.Read`, `Calendars.Read` — no write claims  
**Public-health flag:** `microsoft_calendar_configured` from `/api/public-health`

## Surfaces (extended)

| Persona | Route | Microsoft busy-read addition |
|---------|-------|------------------------------|
| Candidate | `/dashboard/calendar/readiness` | `MicrosoftCalendarReadinessBusyReadPanel` |
| Recruiter | `/recruiter/daily-cockpit` | Busy-read stage summary in scheduling proof |
| Company | `/company/hiring-command-center` | Busy-read stage summary in scheduling proof |
| Board | `/board/calendar-readiness` | `MicrosoftCalendarReadinessBusyReadPanel` |
| Offer readiness (×5) | `/dashboard/offer-readiness`, `/profile/offer-readiness`, `/recruiter/offer-readiness`, `/company/offer-readiness`, `/board/offer-readiness` | `OfferCalendarReadinessCard` |

## Merge with existing calendar-readiness

- `resolveMicrosoftCalendarReadiness()` derives from `resolveCalendarReadiness()` for demo candidate
- `deriveMicrosoftFromCalendar()` extracts Microsoft provider row from shared record
- No duplicate `CALENDAR_PROVIDER_ALLOWLIST` — shared allowlist remains in `calendar-readiness-demo-data.ts`
- Operating evidence panel (`calendar-readiness-evidence.ts`) unchanged; offer cross-links retain `/dashboard/calendar/readiness`

## Tests (per slice)

```bash
cd frontend
npm run test:microsoft-calendar-readiness-domain
npm run test:candidate-calendar-readiness
npm run test:recruiter-company-calendar-readiness
npm run test:board-calendar-readiness-monitor
npm run test:offer-readiness
npm run test:trust-language-guard
npm run test:i18n-coverage
npm run build
npx tsc --noEmit
```

**Browser smoke (after deploy):**

```bash
PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app \
  npm run test:board-calendar-readiness-monitor-browser

PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app \
  npm run verify:prod-candidate-calendar-readiness

PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app \
  npm run verify:prod-offer-readiness
```

## Copy guardrails

**Allowed:** busy-read preview, readiness preview, blocked, OAuth env preview, public-health flag, scheduling proof.

**Forbidden:** calendar synced, event created, invite sent, microsoft calendar connected, google calendar connected, notification sent, email sent.

Enforced by slice tests + `npm run test:trust-language-guard`.

## Explicitly out of scope (hard bans)

- Calendar sync, Graph writes, event create/update/delete
- Invites, email, notifications, token display
- Phase 3B, multitab, stress, headless verification batches
- Migrations, shell/gate/layout changes, ATS, payments

## Launch stance (unchanged)

| Gate | Status |
|------|--------|
| Microsoft Graph busy-read live | **NOT SHIPPED** — readiness preview only |
| Public launch | **NO-GO** |
| P0 performance | **OPEN** |
| Phase 3B | **HARD BLOCKED** |

## Related docs

- [MICROSOFT_CALENDAR_READINESS_2026-06-23.md](./MICROSOFT_CALENDAR_READINESS_2026-06-23.md) — prior batch evidence
- [CALENDAR_READINESS_OPERATING_EVIDENCE_2026-06-23.md](./CALENDAR_READINESS_OPERATING_EVIDENCE_2026-06-23.md) — operating evidence panel
- `docs/GOOGLE_CALENDAR_OAUTH_PROD_FIX_2026-05-29.md` — Google OAuth pattern reference

## Next batch (not this slice)

When explicitly unblocked: Microsoft Graph busy read behind OAuth connect UI, hold write behind consent — still no invite dispatch until product gate opens.
