# Placement Events Production Verification — 2026-06-23

**Batch owner:** TWIN Placement Events Auth Smoke Evidence  
**Base:** `cursor/phase1-monorepo-scaffold`  
**Mode:** read-only ops evidence — no DB writes, no product behavior changes

## Purpose

Confirm dedicated production auth smoke for `/api/v1/placement-events` after the live timeline batch (PR #247–#252). Records operator run of `verify:prod-placement-events-auth` with authenticated POST/GET and `placement_id` filter.

## Migration (unchanged)

| Field | Value |
|-------|-------|
| Revision | `068_placement_events_foundation` |
| Chain | `067_request_intake` → `068_placement_events_foundation` (head) |
| Table | `placement_events` (append-only foundation columns) |
| Alembic status | **CONFIRMED** — 2026-06-21 read-only admin endpoint; reaffirmed 2026-06-23 |

## Placement events dedicated auth smoke (2026-06-23)

| Field | Value |
|-------|-------|
| **date** | 2026-06-23 |
| **command** | `TWIN_PROD_BASE_URL=https://twin-sooty.vercel.app` · `TWIN_PROD_TEST_JWT` (local only) · `TWIN_PROD_SMOKE_WRITE=1` · `npm run verify:prod-placement-events-auth` |
| **pass** | 6 |
| **fail** | 0 |
| **skip** | 1 |
| **unauthenticated GET** | **401/403** — no 404/500 |
| **authenticated POST** | **PASS** — `demo_verification_recorded`, `external_side_effect: false` |
| **authenticated GET** | **200** |
| **authenticated GET + placement_id filter** | **200** (`?placement_id=demo-placement-001`) |
| **token logged** | **no** — script never prints JWT |
| **JWT security note** | Prior founder JWT was exposed in chat — **do NOT record token in docs or repo**; obtain a **fresh token** for future smoke runs |

## Placement events API

| Field | Value |
|-------|-------|
| Path | `/api/v1/placement-events` |
| Methods | GET, POST |
| Unauthenticated | **401/403** — no 404/500 on canonical path |
| Non-canonical | `/api/placement-events` (no `/v1`) → **404 expected** — not a smoke failure |
| Auth smoke POST | `demo_verification_recorded` — append-only internal marker |
| External side effects | **none** |

## Explicitly not verified (hard bans)

- No payment, invoice, or revenue recognition
- No employer or legal confirmation
- No email send, ATS writeback, or external provider integration
- No delete/revoke fulfillment or KYC verification claims
- No Phase 3B, multitab, browser stress, or headless-shell verification
- No re-run with previously exposed JWT — fresh token required

## Launch stance (unchanged)

| Gate | Status |
|------|--------|
| placement_events auth smoke | **PASS** |
| Public launch | **NO-GO** |
| P0 performance | **OPEN** |
| Phase 3B | **HARD BLOCKED** |

## Related docs

- `docs/PLACEMENT_EVENTS_PROD_VERIFICATION_2026-06-21.md` — initial Alembic + broad persistence smoke
- `docs/AUTHENTICATED_PROD_PERSISTENCE_SMOKE_2026-06-19.md`
- `docs/PRODUCTION_PERSISTENCE_STATUS_2026-06-19.md`
- `docs/PLACEMENT_VERIFICATION_2026-06-21.md`
- `docs/P0_PERFORMANCE_INVENTORY_2026-06-21.md`

## Prod smoke command

```bash
TWIN_PROD_BASE_URL=https://twin-sooty.vercel.app \
  TWIN_PROD_TEST_JWT="$TWIN_PROD_TEST_JWT" \
  TWIN_PROD_SMOKE_WRITE=1 \
  npm run verify:prod-placement-events-auth
```

Without JWT: tests 1–2 + 7 run; tests 3–6 skip (exit 0).
