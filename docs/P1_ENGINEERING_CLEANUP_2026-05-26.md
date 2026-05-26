# P1 engineering cleanup — 2026-05-26

Branch: `cursor/phase1-monorepo-scaffold`  
Commit: `chore(p1): start engineering cleanup`

Scope: stabilisation after FULL GO E2E and P0 CTO audit. **No new product features.**

## Fixed in this pass

| Area | Change |
|------|--------|
| Backend tests | Critical suite **53/53 pass** (health, auth, matching, feedback, demo, waitlist) — no product behaviour changes for tests |
| Public health `?ops=1` | **Reduced leakage**: booleans + market scrape summary only; **removed** OAuth/calendar redirect URIs, `ops_admin_configured`, `data_room_*`, `celery_task_always_eager` from public JSON |
| Admin deploy audit | **`GET /api/v1/admin/deploy-health`** (Bearer `OPS_ADMIN_TOKEN` / `BETA_ADMIN_TOKEN`) returns full former `?ops=1` detail including redirect URIs |
| Security headers | `frontend/next.config.ts` + `frontend/vercel.json`: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`; **CSP Report-Only** in Next config (not enforcing — avoids breaking Next inline scripts) |
| Lint (quick) | Removed unused `nfLocale` in `pricing-locale.ts` (1 warning) |
| `/status` | Unchanged UX — still uses `/api/public-health` → `?db=1&ops=1` (public booleans sufficient) |

## Lint debt (P1 — not fixed here)

**Before:** 64 problems (55 errors, 9 warnings)  
**After quick fix:** ~63 problems (55 errors, ~8 warnings) — run `cd frontend && npm run lint` for exact count.

| Rule | Count (approx.) | Why deferred |
|------|-----------------|--------------|
| `react-hooks/set-state-in-effect` | ~50 errors | Touches dashboard, marketing hooks, site header — needs focused refactor, not drive-by |
| `@typescript-eslint/no-unused-vars` | ~8 warnings | Low risk; batch with dashboard pass |
| Other | scattered | Same |

**Why dashboard refactor is a separate step:** `dashboard/page.tsx` is ~2.2k LoC; fixing `set-state-in-effect` properly means restructuring data loading (SWR/React Query or server components), not eslint-disable. P1 cleanup must not change core dashboard flows or investor demo paths.

## P1 remaining (next slices)

- Prod: confirm `GET /api/v1/admin/deploy-health` with founder token after deploy; update personal curl scripts from `health?ops=1` when needing redirect URIs
- Frontend lint: dedicated PR for dashboard/marketing hook patterns
- JWT in **httpOnly** cookie — see P2 security sprint below
- `Content-Security-Policy` enforce mode after Report-Only review in browser console
- Investor runbooks still mentioning `live_db` on demo snapshot (docs-only)

## P2 remaining

| Item | Notes |
|------|--------|
| **JWT / httpOnly cookie security sprint** | Today: bearer in `localStorage` + `Authorization` header. Moving tokens to httpOnly cookies requires CSRF strategy, proxy cookie forwarding, and auth middleware changes across FastAPI + Next — **separate security sprint**, not mixed with P1 lint/health |
| LinkedIn OAuth prod | Sign-in only |
| Full scrape compliance review | Global HTML boards |
| E2E beyond smoke | Playwright expansion |

## Backend test command (regression)

```bash
cd backend && pytest tests/test_health*.py tests/test_auth*.py tests/test_matching*.py \
  tests/test_*feedback* tests/test_*demo* tests/test_beta_waitlist*.py -q
```

## Founder curl migration

| Need | Endpoint |
|------|----------|
| Login OAuth flags, `/status` booleans | `GET /api/v1/health?ops=1` (unchanged) |
| Redirect URI audit, data-room flags | `GET /api/v1/admin/deploy-health` + `Authorization: Bearer $OPS_ADMIN_TOKEN` |
| Calendar redirect whitelist | `GET /api/v1/calendar/oauth-config` (unchanged) |

## Safe to deploy?

**Yes** for API + Vercel frontend: backward-compatible JSON (fewer public fields). `/status` and OAuth login unchanged. After deploy, spot-check `/status` and one OAuth login page.

**Do not** treat as public launch — P1 lint and httpOnly auth remain.
