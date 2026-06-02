# S2 CSP burn-in window — 2026-06-01

## Window metadata (active)

- Burn-in start UTC: `2026-06-02T14:18:33Z` (**NEW** window — post `connect-src` fix deploy)
- 72h target end UTC: `2026-06-05T14:18:33Z`
- Prior window start UTC: `2026-06-02T07:06:17Z` → **RESET** (invalid; see § Burn-in reset)
- Production URL: `https://twin-sooty.vercel.app`
- CSP mode: `Content-Security-Policy-Report-Only` (RO) — **enforce absent** on all audited routes
- Narrowed CSP on prod: **LIVE** (explicit allowlists, no broad `https:` wildcards)
- `connect-src` Railway API host: **DEPLOYED** (`https://twin-production-bcd9.up.railway.app` in `frontend/next.config.ts`)
- S2 status: **IN PROGRESS** — 72h evidence window running; **NOT READY** for enforce / S2 PASS
- S2 PASS: **NO**
- Public launch: **NO-GO**

## Burn-in reset (2026-06-02)

**Finding (founder Railway logs, ~2026-06-01 20:52–20:53 CEST):** `connect-src` report-only violations on `/dashboard` (`document-uri`: `https://twin-sooty.vercel.app/dashboard`). `blocked-uri` host: `https://twin-production-bcd9.up.railway.app` (calendar, jobs, applications, opportunities, auto-apply, gamification, etc.). Disposition: report-only — not an outage; expected when prod sets `NEXT_PUBLIC_API_URL` and authenticated fetches hit Railway directly.

**Fix:** Add `https://twin-production-bcd9.up.railway.app` to narrowed `connect-src` in `frontend/next.config.ts` (report-only unchanged; no wildcards). **Merged and deployed** to production frontend (founder-verified post-fix).

**Clock:** Prior 72h window (`2026-06-02T07:06:17Z` → `2026-06-05T07:06:17Z`) **RESET** — invalid after `connect-src` gap. **New** 72h window started `2026-06-02T14:18:33Z` after post-fix checks (public-health, Railway API health, dashboard OK, no fresh `csp_report` violations for `twin-production-bcd9.up.railway.app`).

## Post-fix founder verification (2026-06-02)

| Check | Result |
| --- | --- |
| `GET /api/public-health` (via FE alias) | `status=ok`, `db_ok=true` — see snapshot below |
| Railway API health | OK |
| Dashboard | OK |
| Railway logs: `csp_report violation` for `twin-production-bcd9.up.railway.app` | **No fresh violations** after fix deploy |

## Header audit (read-only, no auth/cookies)

Source checks at window start (report-only; enforce absent):

- `bash scripts/audit-csp-headers.sh` (when run)
- Manual `curl -sI` for 8 routes

| Route | HTTP | CSP-RO present | CSP enforce present | `report-uri` present | Narrowed policy live |
| --- | --- | --- | --- | --- | --- |
| `/` | 200 | yes | no | yes | yes |
| `/dashboard` | 200 | yes | no | yes | yes |
| `/login/candidate` | 200 | yes | no | yes | yes |
| `/register/candidate` | 200 | yes | no | yes | yes |
| `/demo` | 200 | yes | no | yes | yes |
| `/status` | 200 | yes | no | yes | yes |
| `/dashboard/calendar` | 200 | yes | no | yes | yes |
| `/api/public-health` | 200 | yes | no | yes | yes |

Enforce header check: **not present** on all routes.

## Public-health snapshot (read-only)

From `GET /api/public-health` (via FE alias), captured at burn-in restart (`2026-06-02T14:18:33Z`):

| Field | Value |
| --- | --- |
| `status` | `ok` |
| `db_ok` | `true` |
| `validated_jobs` | `652` |
| `market_coverage_active_validated` | `2579` |
| `worker_active` | `true` |
| `broker_configured` | `true` |

## Required evidence list before founder decision (6)

- 1) Burn-in start + end timestamps and immutable header audit evidence for the 8 routes.
- 2) Railway log triage for full 72h (`csp_report violation` cadence + hourly rollup + unique `blocked-uri` list).
- 3) False-positive triage decisions (extensions/bots/dev-noise) with explicit include/exclude rationale.
- 4) Multi-browser DevTools checklist (Chrome, Safari, Firefox, mobile Safari, mobile Chrome) completed on required routes.
- 5) Founder demo dry-run evidence on the same alias with pass/fail notes and any CSP anomalies.
- 6) Founder sign-off line (HOLD report-only / approve enforce PR) after reviewing logs + DevTools pack.

## Early checkpoint (2026-06-02)

**Checkpoint UTC:** `2026-06-02T14:32:09Z` (~14m after burn-in restart `2026-06-02T14:18:33Z`)

**Source:** Founder early Railway log triage (search: `csp_report`)

| Finding | Detail |
| --- | --- |
| Fresh `csp_report` after restart | **None** |
| Historical violations | Jun 1 2026 20:52–20:53 CEST — `connect-src` / Railway API host (`twin-production-bcd9.up.railway.app`); **fixed** in `24146f9` deploy |
| Enforce header | **Absent** (unchanged) |
| Decision | **CONTINUE** 72h burn-in — report-only HOLD |
| S2 status | **NOT READY** |
| S2 PASS | **NO** |
| Public launch | **NO-GO** |

**Next manual checkpoint (UTC):** `2026-06-02T18:18:33Z` (~4h after start) — Railway `csp_report` log triage + note any new `blocked-uri`.

## Manual checkpoint (2026-06-02)

**Checkpoint UTC:** `2026-06-02T14:42:07Z` (~24m after burn-in start `2026-06-02T14:18:33Z`)

**Source:** Founder dashboard smoke + route spot check + Railway log triage (`csp_report`)

| Check | Result |
| --- | --- |
| Dashboard smoke | **OK** |
| Routes (no white screen / breaking errors) | Dashboard, Jobs, Profile, Calendar, Demo — **OK** |
| Railway `csp_report` after `2026-06-02T14:18:33Z` | **No fresh entries** |
| Historical violations | Jun 1 2026 `connect-src` / Railway API — **known, fixed** |
| Enforce header | **Absent** (unchanged) |
| Decision | **CONTINUE** 72h burn-in — report-only HOLD |
| S2 status | **NOT READY** |
| S2 PASS | **NO** |
| Public launch | **NO-GO** |

**Next manual checkpoint (UTC):** `2026-06-02T18:18:33Z` (~4h after start) — Railway `csp_report` log triage + route/DevTools cadence per checklist.

## Manual checkpoint cadence

- **Window end review:** `2026-06-05T14:18:33Z` — full 72h evidence pack before any enforce decision.

## Guardrails

- Do **not** enable enforce mode in this window.
- Do **not** claim S2 PASS during this window.
- Public launch remains **NO-GO** until founder decision after full 72h evidence review.
