# Microsoft Graph Busy-Read Live Read-Only — 2026-06-24

**Batch owner:** TWIN Microsoft Graph Read-Only Busy Retrieval Product Gate  
**Base:** `cursor/phase1-monorepo-scaffold` @ fa72776 (PR #263 merged)  
**Shipped:** PRs #264–#268 (5 slices, 2026-06-24)  
**Mode:** read-only busy availability proof behind product gate — **no** calendar sync, Graph writes, invites, email, or token display

## Purpose

Full-stack **read-only busy-read contract**: backend readiness + preview APIs, frontend live wiring with demo/401/partial fallback, product gates default **off**. Surfaces show capability contract, redacted busy slot preview, and disabled OAuth connect UI — not live OAuth redirects or created events.

## Backend API (read-only)

| Endpoint | Auth | Description |
|----------|------|-------------|
| `GET /api/v1/calendar/microsoft/busy-read/readiness` | Bearer | Capability contract: scopes, gates, oauth state — **no tokens** |
| `GET /api/v1/calendar/microsoft/busy-read/preview` | Bearer | Redacted busy slots: `demo` / `not_connected` / `live_read_only` / `partial` |

**Service:** `backend/app/services/microsoft_busy_read.py` — live Graph uses read-only `getSchedule` only when `MICROSOFT_BUSY_READ_ENABLED=true` and calendar connected; stubs on token/scope errors (`live_graph_stub: true`). Microsoft calendar OAuth requests **`Calendars.Read` only** (PRs #269–#273, 2026-06-24) — `Calendars.ReadWrite` stripped from authorize/token/refresh and blocked via env override sanitization. **Live busy-read remains disabled in production** (`MICROSOFT_BUSY_READ_ENABLED=false`).

## Product gates (default false)

| Flag | Backend env | Frontend env |
|------|-------------|--------------|
| Busy-read live | `MICROSOFT_BUSY_READ_ENABLED` | `NEXT_PUBLIC_MICROSOFT_BUSY_READ_ENABLED` |
| OAuth connect UI | `MICROSOFT_OAUTH_CONNECT_GATE_ENABLED` | `NEXT_PUBLIC_MICROSOFT_OAUTH_CONNECT_GATE_ENABLED` |

Public health (`?ops=1`): `microsoft_busy_read_enabled`, `microsoft_oauth_connect_gate_enabled`, `microsoft_calendar_configured`.

## Frontend artifacts

| Artifact | Path |
|----------|------|
| Capability contract + gates | `frontend/src/lib/microsoft-busy-read.ts` |
| Live API merge + paths | `frontend/src/lib/microsoft-busy-read-api.ts` |
| Auth hook (demo/401/partial fallback) | `frontend/src/lib/use-microsoft-busy-read-live.ts` |
| Demo busy slots (redacted) | `frontend/src/lib/microsoft-busy-read-demo-data.ts` |
| Build-time flags | `frontend/src/lib/features.ts` |
| Prior readiness layer | `frontend/src/lib/microsoft-calendar-readiness.ts` |

**Required scopes:** `offline_access`, `User.Read`, `Calendars.Read`  
**Forbidden scopes:** `Calendars.ReadWrite`, `Mail.Send`, `OnlineMeetings.ReadWrite`  
**Busy slot preview:** `event_subject_redacted: true`, sources `demo` / `live_read_only` / `partial`  
**OAuth connect gate:** default **disabled** — connect button no-op until gate opens

## Surfaces

| Persona | Route | Addition |
|---------|-------|----------|
| Candidate | `/dashboard/calendar/readiness` | Live API wiring + slot preview + OAuth gate |
| Board | `/board/calendar-readiness` | Slot preview + OAuth gate + cross-link |
| Recruiter | `/recruiter/daily-cockpit` | Compact slot preview (live hook) |
| Company | `/company/hiring-command-center` | Compact slot preview (live hook) |
| Offer readiness | offer routes | `MicrosoftBusyReadCrossLinkCard` |
| Placement | placement routes | `MicrosoftBusyReadCrossLinkCard` |

## Data redaction

- No event subject or body in API or UI — `event_subject_redacted: true` only
- No token display in OAuth gate or API responses
- Demo slots use synthetic ISO timestamps when gate off or 401 fallback

## Tests

```bash
# Backend
cd backend && pytest tests/test_microsoft_busy_read_readiness.py tests/test_microsoft_busy_read_preview.py -q

# Frontend
cd frontend
npm run test:microsoft-busy-read-contract
npm run test:microsoft-busy-read-api-wiring
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
```

## PR batch (2026-06-24)

| Slice | PR | Branch |
|-------|-----|--------|
| 1 Backend readiness contract | #264 | `feature/backend-microsoft-busy-read-readiness-contract-2026-06-24` |
| 2 Product gate | #265 | `feature/microsoft-busy-read-product-gate-2026-06-24` |
| 3 Service adapter | #266 | `feature/microsoft-busy-read-service-adapter-2026-06-24` |
| 4 Frontend UI wiring | #267 | `feature/microsoft-busy-read-ui-state-wiring-2026-06-24` |
| 5 Docs evidence | #268 | `docs/microsoft-busy-read-live-readiness-evidence-2026-06-24` |

## OAuth scope hardening batch (2026-06-24)

| Slice | PR | Branch |
|-------|-----|--------|
| 1 Audit | #269 | `fix/microsoft-calendar-readonly-scope-audit-2026-06-24` |
| 2 Remove ReadWrite | #270 | `fix/microsoft-calendar-readonly-oauth-scopes-2026-06-24` |
| 3 Gate safety tests | #271 | `test/microsoft-busy-read-product-gate-safety-2026-06-24` |
| 4 UI copy alignment | #272 | `fix/microsoft-calendar-readonly-copy-evidence-2026-06-24` |
| 5 Docs evidence | #273 | `docs/microsoft-calendar-readonly-scope-evidence-2026-06-24` |

## Explicitly out of scope (hard bans)

- Calendar sync, Graph writes, event create/update/delete
- Invites, email, notifications, token display
- Phase 3B, multitab, stress, headless verification
- Migrations, shell/gate/layout changes

## Launch stance

| Gate | Status |
|------|--------|
| Microsoft Graph busy-read live | **NOT SHIPPED** — OAuth scopes migrated to read-only; gates default off |
| Public launch | **NO-GO** |
| P0 performance | **OPEN** |
| Phase 3B | **HARD BLOCKED** |

## Next milestone

1. ~~Migrate Microsoft calendar OAuth to `Calendars.Read`~~ **Done** (PRs #269–#273).
2. Set `MICROSOFT_BUSY_READ_ENABLED=true` in staging only after founder smoke with read-only tokens.
3. Optionally enable `MICROSOFT_OAUTH_CONNECT_GATE_ENABLED` for connect UI — still read-only, no writes.
4. Azure: ensure delegated `Calendars.Read` granted; remove admin consent for `Calendars.ReadWrite` on new connections.

## Related docs

- [MICROSOFT_CALENDAR_READINESS_2026-06-24.md](./MICROSOFT_CALENDAR_READINESS_2026-06-24.md) — prior readiness layer (PR #262)
- [CALENDAR_READINESS_OPERATING_EVIDENCE_2026-06-23.md](./CALENDAR_READINESS_OPERATING_EVIDENCE_2026-06-23.md) — board calendar evidence
- [PLACEMENT_VERIFICATION.md](./PLACEMENT_VERIFICATION.md) — placement evidence cross-links
