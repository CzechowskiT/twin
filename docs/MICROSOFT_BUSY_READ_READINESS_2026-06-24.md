# Microsoft Graph Busy-Read Live Read-Only OAuth Gate — 2026-06-24

**Batch owner:** TWIN Microsoft Graph Busy-Read Live Read-Only OAuth Gate  
**Base:** `cursor/phase1-monorepo-scaffold` @ c5f3db5 (PR #262 merged)  
**Mode:** read-only busy availability proof behind product gate — **no** calendar sync, Graph writes, invites, email, or token display

## Purpose

Continue after Microsoft Graph Busy-Read Readiness Layer (PR #262) toward **read-only busy availability proof** behind a clear OAuth connect gate. Surfaces show capability contract, redacted busy slot preview, and disabled connect UI — not live OAuth redirects or created events.

## Capability contract

| Artifact | Path |
|----------|------|
| Busy-read capability contract | `frontend/src/lib/microsoft-busy-read.ts` |
| Demo busy slots (redacted) | `frontend/src/lib/microsoft-busy-read-demo-data.ts` |
| Prior readiness layer (unchanged merge) | `frontend/src/lib/microsoft-calendar-readiness.ts` |
| Test | `npm run test:microsoft-busy-read-contract` |

**Required scopes:** `offline_access`, `User.Read`, `Calendars.Read`  
**Forbidden scopes:** `Calendars.ReadWrite`, `Mail.Send`, `OnlineMeetings.ReadWrite`  
**Busy slot preview:** `event_subject_redacted: true`, sources `demo` / `live_read_only` / `partial`  
**OAuth connect gate:** `MICROSOFT_OAUTH_CONNECT_GATE_ENABLED = false` — connect disabled/no-op

## Surfaces (extended)

| Persona | Route | Addition |
|---------|-------|----------|
| Candidate | `/dashboard/calendar/readiness` | Slot preview panel + OAuth connect gate |
| Board | `/board/calendar-readiness` | Slot preview + OAuth gate + cross-link |
| Recruiter | `/recruiter/daily-cockpit` | Compact slot preview |
| Company | `/company/hiring-command-center` | Compact slot preview |
| Offer readiness | `/dashboard/offer-readiness`, recruiter/company/board offer routes | `MicrosoftBusyReadCrossLinkCard` |
| Placement | `/dashboard/placement-verification`, `/board/placement-verification` | `MicrosoftBusyReadCrossLinkCard` |

## Data redaction

- No event subject or body in UI — `eventDetailsRedacted` copy only
- No token display in OAuth gate
- Demo slots use synthetic ISO timestamps only

## Tests (per slice)

```bash
cd frontend
npm run test:microsoft-busy-read-contract
npm run test:microsoft-busy-slot-preview-panel
npm run test:microsoft-oauth-connect-ui-gate
npm run test:board-calendar-readiness-monitor
npm run test:offer-readiness
npm run test:placement-verification-domain
npm run test:trust-language-guard
npm run test:i18n-coverage
npm run build
npx tsc --noEmit
```

**Prod smoke (after deploy):**

```bash
PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app \
  npm run test:board-calendar-readiness-monitor-browser

PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app \
  npm run verify:prod-candidate-calendar-readiness

PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app \
  npm run verify:prod-offer-readiness
```

## Explicitly out of scope (hard bans)

- Calendar sync, Graph writes, event create/update/delete
- Invites, email, notifications, token display
- Phase 3B, multitab, stress, headless verification
- Migrations, shell/gate/layout changes

## Launch stance (unchanged)

| Gate | Status |
|------|--------|
| Microsoft Graph busy-read live | **NOT SHIPPED** — contract + preview + disabled OAuth gate |
| Public launch | **NO-GO** |
| P0 performance | **OPEN** |
| Phase 3B | **HARD BLOCKED** |

## Next milestone (not this batch)

When explicitly unblocked: backend OAuth connect + real read-only `Calendars.Read` busy slot retrieval — still no writes, invites, or notifications until product gate opens.

## Related docs

- [MICROSOFT_CALENDAR_READINESS_2026-06-24.md](./MICROSOFT_CALENDAR_READINESS_2026-06-24.md) — prior readiness layer (PR #262)
- [PLACEMENT_VERIFICATION.md](./PLACEMENT_VERIFICATION.md) — placement evidence cross-links
- `docs/GOOGLE_CALENDAR_OAUTH_PROD_FIX_2026-05-29.md` — Google OAuth pattern reference
