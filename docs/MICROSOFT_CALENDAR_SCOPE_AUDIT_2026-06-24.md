# Microsoft Calendar OAuth Scope Audit — 2026-06-24

**Batch owner:** TWIN Microsoft Calendar OAuth Scopes Hardening  
**Base:** `cursor/phase1-monorepo-scaffold` @ 9eea30d (after PRs #264–#268)  
**Mission:** Remove `Calendars.ReadWrite` from active Microsoft calendar OAuth scopes. Final scopes: `offline_access`, `User.Read`, `Calendars.Read` only.

## Executive summary

| Finding | Severity | Location |
|---------|----------|----------|
| Active OAuth requests `Calendars.ReadWrite` | **P0 mismatch** | `backend/app/services/microsoft_calendar_oauth.py` |
| Busy-read contract already read-only | OK | `backend/app/services/microsoft_busy_read.py` |
| Product gates default off | OK | `backend/app/config.py`, `frontend/src/lib/features.ts` |
| Demo data still shows `Calendars.ReadWrite` in shared calendar readiness | **P1 copy drift** | `frontend/src/lib/calendar-readiness-demo-data.ts` |
| Interview write endpoint exists (legacy) | **Documented risk** | `backend/app/api/calendar_microsoft.py` POST `/microsoft/interviews` |
| Prod env docs reference `Calendars.ReadWrite` | **P1 docs drift** | `docs/RAILWAY_PROD_ENV_PL.md` |

**Verdict:** Safe to migrate OAuth authorize/token/refresh scopes to read-only. No blocker on live OAuth path — authorize URL is server-built; Azure app registration must add `Calendars.Read` delegated permission (founder ops). Interview write endpoint remains but requires separate product gate; not in scope for this batch.

## Active OAuth scope source of truth

| Artifact | Current value | Target |
|----------|---------------|--------|
| `MS_CALENDAR_SCOPES` | `offline_access User.Read Calendars.ReadWrite` | `offline_access User.Read Calendars.Read` |
| Authorize URL (`build_microsoft_calendar_authorize_url`) | uses `MS_CALENDAR_SCOPES` | must contain `Calendars.Read`, NOT `Calendars.ReadWrite` |
| Token exchange (`exchange_microsoft_calendar_code`) | uses `MS_CALENDAR_SCOPES` | same |
| Token refresh (`refresh_microsoft_calendar_tokens`) | uses `MS_CALENDAR_SCOPES` | same |

**File:** `backend/app/services/microsoft_calendar_oauth.py`

## Busy-read contract (already aligned)

| Constant | Value |
|----------|-------|
| `REQUIRED_SCOPES` | `offline_access`, `User.Read`, `Calendars.Read` |
| `FORBIDDEN_SCOPES` | `Calendars.ReadWrite`, `Mail.Send`, `OnlineMeetings.ReadWrite` |

**File:** `backend/app/services/microsoft_busy_read.py`  
**API:** `GET /api/v1/calendar/microsoft/busy-read/readiness`, `GET .../preview`  
**Gates:** `MICROSOFT_BUSY_READ_ENABLED=false`, `MICROSOFT_OAUTH_CONNECT_GATE_ENABLED=false` (default)

## Product gates (must remain false in prod)

| Flag | Backend default | Frontend default |
|------|-----------------|------------------|
| Busy-read live | `microsoft_busy_read_enabled: False` | `NEXT_PUBLIC_MICROSOFT_BUSY_READ_ENABLED` unset → false |
| OAuth connect UI | `microsoft_oauth_connect_gate_enabled: False` | `NEXT_PUBLIC_MICROSOFT_OAUTH_CONNECT_GATE_ENABLED` unset → false |

**Public health (`?ops=1`):** `microsoft_busy_read_enabled`, `microsoft_oauth_connect_gate_enabled`, `microsoft_calendar_configured`

## Grep inventory — `Calendars.ReadWrite`

| Path | Role | Action |
|------|------|--------|
| `backend/app/services/microsoft_calendar_oauth.py` | **Active OAuth scope** | **Remove (slice 2)** |
| `backend/app/services/microsoft_busy_read.py` | Forbidden list (correct) | Keep |
| `frontend/src/lib/calendar-readiness-demo-data.ts` | Demo `scopes_preview` | **Fix to Calendars.Read (slice 4)** |
| `frontend/src/lib/microsoft-busy-read-demo-data.ts` | Forbidden list (correct) | Keep |
| `frontend/scripts/calendar-readiness-domain.test.ts` | Asserts ReadWrite in demo | **Update (slice 4)** |
| `frontend/scripts/microsoft-oauth-connect-ui-gate.test.ts` | Forbidden scope test | Keep |
| `frontend/scripts/microsoft-busy-read-contract.test.ts` | Forbidden scope test | Keep |
| `docs/MICROSOFT_BUSY_READ_READINESS_2026-06-24.md` | Notes pending migration | **Update (slice 5)** |
| `docs/RAILWAY_PROD_ENV_PL.md` | Azure permissions guide | **Update (slice 5)** |
| `docs/ROADMAP_100_ACCEPTANCE.md` | Historical P0 write scope | Informational only |

## Grep inventory — `MS_CALENDAR_SCOPES` / `calendar_microsoft`

| Path | Notes |
|------|-------|
| `backend/app/api/calendar_microsoft.py` | Authorize, callback, events, freebusy, interviews |
| `backend/app/api/router.py` | Router mount |
| `backend/tests/test_calendar_routes.py` | Status/health mocks |
| `backend/tests/test_microsoft_busy_read_*.py` | Readiness/preview contract |

## Write paths (out of scope — hard bans enforced)

| Endpoint | Method | Graph API | Blocked by |
|----------|--------|-----------|------------|
| `/api/v1/calendar/microsoft/interviews` | POST | `insert_calendar_event` | Product gate + scope migration |
| Event list/freebusy | GET | read APIs | OK with `Calendars.Read` |

No new write scopes, event writes, invites, sync, or email in this batch.

## Frontend surfaces (read-only copy)

| Surface | Route | Scope evidence |
|---------|-------|----------------|
| Candidate calendar readiness | `/dashboard/calendar/readiness` | `MicrosoftOAuthConnectUiGate`, busy-read panel |
| Board monitor | `/board/calendar-readiness` | Same gate + slot preview |
| Offer readiness (×5) | offer routes | `MicrosoftBusyReadCrossLinkCard` |
| Placement | placement routes | Cross-link card |
| i18n | `microsoftCalendarReadiness`, `microsoftBusyRead` | Already says Calendars.Read only |

## Test coverage map

| Test | Slice |
|------|-------|
| `test_microsoft_busy_read_readiness.py` | 3 — gate defaults |
| New `test_microsoft_calendar_oauth_scopes.py` | 2 — authorize URL |
| `microsoft-oauth-connect-ui-gate.test.ts` | 3 — no redirect when disabled |
| `calendar-readiness-domain.test.ts` | 4 — scopes_preview |
| `microsoft-busy-read-contract.test.ts` | 2/3 |
| `trust-language-guard`, `i18n-coverage`, `build`, `tsc` | All |

## Azure founder ops (post-merge)

1. Azure App Registration → API permissions → add delegated `Calendars.Read` (if not present).
2. Remove or do not grant admin consent for `Calendars.ReadWrite` on new connections.
3. Keep `MICROSOFT_BUSY_READ_ENABLED=false` and `MICROSOFT_OAUTH_CONNECT_GATE_ENABLED=false` in Railway prod until explicit staging smoke.

## Launch stance

| Gate | Status |
|------|--------|
| OAuth scope migration | **IN PROGRESS** (this batch) |
| Live busy-read on prod | **NOT ENABLED** |
| Public launch | **NO-GO** |
| Phase 3B | **HARD BLOCKED** |

## Slice plan

| # | Branch | PR title |
|---|--------|------------|
| 1 | `fix/microsoft-calendar-readonly-scope-audit-2026-06-24` | Audit Microsoft calendar OAuth scopes |
| 2 | `fix/microsoft-calendar-readonly-oauth-scopes-2026-06-24` | Use read-only Microsoft calendar OAuth scopes |
| 3 | `test/microsoft-busy-read-product-gate-safety-2026-06-24` | Harden Microsoft busy-read product gate tests |
| 4 | `fix/microsoft-calendar-readonly-copy-evidence-2026-06-24` | Align Microsoft calendar read-only scope copy |
| 5 | `docs/microsoft-calendar-readonly-scope-evidence-2026-06-24` | Document Microsoft calendar read-only scopes |
