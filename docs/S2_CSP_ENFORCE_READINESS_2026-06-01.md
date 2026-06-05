# S2 CSP enforce readiness — 2026-06-01

**Branch:** `chore/s2-csp-burnin-readiness-2026-06-01`
**Auditor role:** TWIN CSP S2 burn-in / enforce readiness auditor
**Verdict:** **S2 PASS** — enforce PR merged + deployed (`6862999`); post-enforce smoke **PASS** (`2026-06-05T16:20:13Z`).

Public launch remains **NO-GO** (founder limited-launch decision pending).
**24h monitoring:** Railway `csp_report` cadence through `2026-06-06T16:20:13Z`.

**24h post-enforce founder checkpoint (2026-06-06):** Railway `csp_report` — **brak świeżych wpisów**; core routes OK. **Decision: CONTINUE** (no rollback).

## Executive summary

| Area | Status |
| ---- | ------ |
| Prod CSP mode | **Enforce** on all audited routes (`Content-Security-Policy` present; Report-Only absent) |
| `report-uri /api/v1/csp-report` | **Present** on all audited routes |
| Report sink (`POST /api/v1/csp-report`) | **Live** — storage-free, rate-limited, sanitization tested |
| 72h burn-in violation triage | **COMPLETE** — Railway clean full window; DevTools PASS; see § Final 72h rollup |
| Post-enforce smoke | **PASS** — founder Chrome Incognito `2026-06-05T16:20:13Z`; see § Post-enforce smoke — S2 PASS |
| Directive narrowing (host allowlists) | **LIVE** on prod since enforce deploy |
| Founder enforce decision | **EXECUTED** — PR #32 @ `6862999` merged + Vercel deployed |

## CSP implementation map

### Where headers are set

| Layer | File | Role |
| ----- | ---- | ---- |
| Next.js static headers | `frontend/next.config.ts` | Sets `Content-Security-Policy-Report-Only` on `/:path*` |
| Middleware | `frontend/src/middleware.ts` | Bot guard + signup redirect only — **does not set CSP** |
| Vercel platform | (automatic) | Adds `Strict-Transport-Security` on HTTPS responses |

### Current policy (report-only, prod alias 2026-06-01)

**Production (live today):** permissive `https:` wildcards — unchanged until next frontend deploy.

**Repo (prepared 2026-06-01):** narrowed host allowlists — see `docs/S2_CSP_EXTERNAL_ORIGIN_INVENTORY_2026-06-01.md`.

Prod header sample (unchanged on live alias until deploy):

```
Content-Security-Policy-Report-Only:
  default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; … img-src 'self' data: https:; … connect-src 'self' https:; … report-uri /api/v1/csp-report
```

Repo narrowed policy — full string in `docs/S2_CSP_EXTERNAL_ORIGIN_INVENTORY_2026-06-01.md`.

### Dev vs prod

| Aspect | Dev (`next dev`) | Prod (Vercel) |
| ------ | ---------------- | ------------- |
| CSP header source | `next.config.ts` `headers()` | Same |
| Mode | Report-only | Report-only |
| HSTS | Not from Next config | Vercel: `max-age=63072000; includeSubDomains; preload` |
| Report sink | Proxied via `/api/v1/[[...path]]/route.ts` → Railway API | Same |

### External domains (inventory for future enforce narrowing)

See `docs/P1_CSP_ENFORCEMENT_PLAN_2026-05-27.md` for the full allowlist target.
Key browser-reachable origins today:

| Directive | Origins |
| --------- | ------- |
| `script-src` | `'self'`, `'unsafe-inline'`, `'unsafe-eval'`, `https://plausible.io` (after cookie consent) |
| `connect-src` | `'self'`, `https://plausible.io`, `https://us.i.posthog.com` |
| `img-src` | `'self'`, `data:`, `https:` wildcard + favicon CDNs (see plan) |
| `font-src` | `'self'`, `data:` (Geist self-hosted via `next/font`) |
| `frame-src` | `https://www.youtube-nocookie.com` (founders page) — **not in current CSP string** |
| OAuth (Google/Microsoft/GitHub/Apple) | Redirect flows — no in-page `connect-src` needed |
| Stripe | Server-side Checkout redirect only — **no client CSP entry** |
| Railway API | Via Vercel `/api/v1` proxy — `'self'` suffices |

**Nonce/hash:** Not implemented. `'unsafe-inline'` + `'unsafe-eval'` remain (separate security-plan item).

## Read-only production header audit (2026-06-01 UTC)

Base URL: `https://twin-sooty.vercel.app`
Method: `curl -sI` (no auth, no cookies)

| Route | Status | CSP-RO | CSP enforce | report-uri | HSTS | X-Frame-Options | Redirect |
| ----- | ------ | ------ | ----------- | ---------- | ---- | --------------- | -------- |
| `/` | 200 | yes | no | yes | yes | DENY | — |
| `/dashboard` | 200 | yes | no | yes | yes | DENY | — |
| `/login/candidate` | 200 | yes | no | yes | yes | DENY | — |
| `/register/candidate` | 200 | yes | no | yes | yes | DENY | — |
| `/demo` | 200 | yes | no | yes | yes | DENY | — |
| `/status` | 200 | yes | no | yes | yes | DENY | — |
| `/dashboard/calendar` | 200 | yes | no | yes | yes | DENY | — |
| `/api/public-health` | 200 | yes | no | yes | yes | DENY | — |

HSTS sample: `max-age=63072000; includeSubDomains; preload`

Re-run: `bash scripts/audit-csp-headers.sh`

## Report sink audit

Endpoint: `POST /api/v1/csp-report` (`backend/app/api/csp_reports.py`)

| Control | Implementation |
| ------- | -------------- |
| Validation | Lenient JSON parse; malformed → DEBUG log, still `204` |
| Sanitization | Whitelist of CSP-spec fields only (`_REPORT_LOG_KEYS`) |
| Redaction | Non-spec fields (cookies, JWT, page HTML) dropped — tested |
| Rate limit | `@limiter.limit("60/minute")` per IP |
| DB model | **None** — storage-free by design (logs only) |
| Response | Always `204 No Content` |

Tests (local 2026-06-01): `pytest tests/test_csp_report*.py` → **9 passed**

Proxy path: `frontend/src/app/api/v1/[[...path]]/route.ts` forwards to Railway API.

## 72h burn-in assessment

Per `docs/P1_CSP_ENFORCEMENT_PLAN_2026-05-27.md` § Risk gates:

| Gate | Evidence | Status |
| ---- | -------- | ------ |
| 1. Preview/prod 72h report-only with zero unexpected violations | No Railway log sample, no violation count, no triage spreadsheet | **MISSING** |
| 2. DevTools spot-check (Chrome/Safari/Firefox/mobile) | Not recorded for 2026-06-01 window | **MISSING** |
| 3. Founder demo dry-run on preview with narrowed CSP | CSP not narrowed; no dry-run record | **MISSING** |
| 4. `/api/v1/csp-report` endpoint live + no-op-safe | Code + tests ✅; header wiring ✅ | **CONFIRMED** |

**Note on “DB triage”:** The sink is intentionally **storage-free** (no `csp_reports` table).
Burn-in triage must come from **Railway/application logs** (`csp_report violation:` WARNING lines)
or a future observability export — not SQL. Checklist item “No PII in csp_reports table” is N/A;
replace with “No PII in log sample” when triaging.

Daily log entries through 2026-05-29 show **HOLD (report-only)** — no 72h clean window documented.

## Enforce flip checklist (founder — do not execute yet)

Preconditions before renaming header in `frontend/next.config.ts`:

- [ ] Narrow `img-src` / `font-src` / `connect-src` to explicit hosts (see enforcement plan)
- [ ] Add missing `frame-src` for YouTube embed if needed
- [ ] Deploy narrowed policy under **Report-Only** on preview alias
- [ ] Collect **72 consecutive hours** of clean violation triage from logs
- [ ] DevTools console clean on all routes in burn-in checklist
- [ ] Founder demo dry-run PASS on preview
- [ ] Explicit founder sign-off on this doc

Enforce flip (when approved):

1. Single-character diff: rename `Content-Security-Policy-Report-Only` → `Content-Security-Policy` in `frontend/next.config.ts`
2. Deploy frontend only (no Railway change)
3. Run post-enforce smoke (below)

## Rollback plan

| Trigger | Action | ETA |
| ------- | ------ | --- |
| Broken page after enforce | Revert header key to `-Report-Only`; redeploy frontend | < 5 min |
| CSP report rate spike | Add violated host to directive; redeploy | < 10 min |
| Mobile white screen | Revert enforce; investigate `'unsafe-eval'` / nonce regression | < 5 min |

No DB/data side-effects from CSP changes.

## Post-enforce smoke (run after founder-approved flip only)

1. `bash scripts/audit-csp-headers.sh` — expect CSP-E=yes, CSP-RO=no
2. `npm run test:security-headers` — update test expectations first
3. Manual: `/`, `/dashboard`, `/login/candidate`, `/register/candidate`, `/demo`, `/status`, `/dashboard/calendar`
4. Google Calendar connect + event display (OAuth must not break)
5. Stripe Checkout redirect (server-side — should be unaffected)
6. Cookie consent → Plausible/PostHog load without console CSP errors
7. `GET /api/public-health` → `status=ok`

## Post-enforce smoke — S2 PASS

**Checkpoint UTC:** `2026-06-05T16:20:13Z`
**Enforce deploy:** PR #32 @ `6862999` (`chore/s2-csp-enforce-pr-2026-06-05`) — merged + Vercel deployed
**Burn-in rollup source:** `9074150` (`chore/s2-csp-burnin-readiness-2026-06-01`)
**Producer:** Founder manual smoke (Chrome Incognito)

| Field | Value |
| --- | --- |
| Chrome Incognito routes | `/`, `/login/candidate`, `/register/candidate`, `/dashboard`, `/dashboard/calendar`, `/demo`, `/status`, `/api/public-health` — **OK**, brak CSP violations |
| Headers | `Content-Security-Policy` **present**; `Content-Security-Policy-Report-Only` **absent** |
| Homepage/logo smoke | **OK** |
| Railway `csp_report` post-enforce | **Brak świeżych wpisów** |
| CSP enforce | **ON** (prod) |
| S2 PASS | **YES** |
| Public launch | **NO-GO** (founder limited-launch decision pending) |
| Pilot / demo | **GO** |
| Auto-apply | **PAUSED** |
| Delegated apply | **NOT LIVE** |
| L6 / O5 | Waivers signed `2026-06-03T13:19:53Z` |
| Recruiter audit | Verdict **C** (candidate-first, recruiter-supporting) |

**Decision:** S2 post-enforce smoke **PASS**

### 24h post-enforce monitoring (founder cadence)

Monitor Railway `csp_report` for **24h** after enforce deploy (`2026-06-05T16:20:13Z` → `2026-06-06T16:20:13Z`). Triage any fresh `blocked-uri` per `docs/S2_CSP_RAILWAY_LOG_TRIAGE_PLAN_2026-06-01.md`. Rollback trigger: broken pages or report spike — revert to Report-Only per § Rollback plan above. **Public launch remains NO-GO** until founder limited-launch decision.

## Public launch stance

- **S2:** ✅ **PASS** — enforce live; post-enforce smoke **PASS** (`2026-06-05T16:20:13Z`); **24h monitoring** active
- **Public launch:** **NO-GO** — founder limited-launch decision pending (L6/O5 waivers pilot-only; GAP-04 optional open)
- **Controlled pilot / demo:** **GO** (separate gates)

## Final 72h S2 rollup — 2026-06-05T14:18:33Z

**Rollup recorded UTC:** `2026-06-05T15:52:51Z` · **Branch HEAD:** `effef83`

| Gate | Evidence | Status |
| ---- | -------- | ------ |
| 72h report-only window | `2026-06-02T14:18:33Z` → `2026-06-05T14:18:33Z` | ✅ **COMPLETE** |
| Railway `csp_report` triage | Founder UI — **no fresh entries** since start | ✅ **CLEAN** |
| Header audit (8 routes) | CSP-RO + `report-uri`; enforce absent | ✅ **PASS** |
| DevTools (Chrome/Safari/Firefox) | Core S2 routes — **no CSP violations** | ✅ **PASS** |
| Logo / homepage smoke | Final PASS `2026-06-04T10:29:29Z` | ✅ **PASS** (non-CSP) |
| Public-health | `status=ok`, `db_ok=true` | ✅ **PASS** |
| Auto-apply | `nightly_auto_apply_beat_enabled=false` | ✅ **PAUSED** (ops) |
| CSP sink tests | `pytest tests/test_csp_report*.py` — **9 passed** | ✅ **PASS** |

**Recommendation A (recommended):** Founder approves **separate enforce PR** — rename `Content-Security-Policy-Report-Only` → `Content-Security-Policy` in `frontend/next.config.ts`; deploy frontend only; run post-enforce smoke checklist § Post-enforce smoke.

**Recommendation B:** **HOLD** report-only — defer enforce; no evidence-based clock reset.

**Verdict:** **READY FOR FOUNDER DECISION** · **NOT S2 PASS** · **NOT public launch GO** · **No enforce flip in this session.**

## Enforce PR prepared — 2026-06-05 (Recommendation A)

**Branch:** `chore/s2-csp-enforce-pr-2026-06-05` · **Base:** `cursor/phase1-monorepo-scaffold` · **Source:** rollup `9074150`

| Item | Status |
| ---- | ------ |
| Code change | Header key `Content-Security-Policy-Report-Only` → `Content-Security-Policy` in `frontend/next.config.ts` (policy string unchanged) |
| Tests / audit script | Updated for enforce-mode expectations |
| PR body | `docs/PR_S2_CSP_ENFORCE_BODY_2026-06-05.md` |
| Merged / deployed | **YES** — PR #32 @ `6862999`; Vercel deployed |
| Prod CSP mode | **Enforce** (`Content-Security-Policy` present; Report-Only absent) |
| S2 PASS | **YES** — post-enforce smoke `2026-06-05T16:20:13Z` |
| Public launch | **NO-GO** (founder limited-launch decision pending) |

**Completed (founder):** Review PR → merge → deploy frontend → post-enforce smoke § Post-enforce smoke — S2 PASS.

## Founder checkpoint — multi-browser DevTools + Railway (2026-06-04)

**Checkpoint UTC:** `2026-06-04T08:47:35Z` (~42h 29m into burn-in; **~59%** elapsed)

| Check | Result |
| ----- | ------ |
| Safari DevTools (core S2 routes + `/` logo) | **PASS** — no CSP violations |
| Firefox DevTools (core S2 routes + `/` logo) | **PASS** — no CSP violations |
| Railway `csp_report` since `2026-06-02T14:18:33Z` | **No fresh entries** |
| Chrome empty white logo plates | **Found** — non-CSP UX; **fixed** in repo (layered initials); post-deploy smoke required |
| Enforce | **OFF** (unchanged) |
| Decision | **CONTINUE** |
| S2 PASS | **NO** |
| Public launch | **NO-GO** |

Full route tables: `docs/S2_CSP_DEVTOOLS_BURNIN_CHECKLIST_2026-06-01.md`.

## Hard bans honoured (this audit session)

- ✅ No Vercel/Railway deploy or restart
- ✅ No migrations or prod DB mutation
- ✅ No prod env changes
- ✅ No scrape/apply/auto-apply/sweep
- ✅ No enforce flip
- ✅ No secrets in output or commits

## Related docs

- `docs/S2_CSP_EXTERNAL_ORIGIN_INVENTORY_2026-06-01.md`
- `docs/S2_CSP_RAILWAY_LOG_TRIAGE_PLAN_2026-06-01.md`
- `docs/S2_CSP_DEVTOOLS_BURNIN_CHECKLIST_2026-06-01.md`
- `docs/S2_CSP_UNSAFE_INLINE_EVAL_ASSESSMENT_2026-06-01.md`
- `docs/P1_CSP_ENFORCEMENT_PLAN_2026-05-27.md`
- `docs/P1_CSP_ENFORCE_BURNIN_CHECKLIST_2026-05-27.md`
- `docs/P1_CSP_ENFORCE_BURNIN_DAILY_LOG_2026-05-27.md`
- `docs/PUBLIC_LAUNCH_GATE_CHECKLIST_2026-05-27.md`
- `docs/PRODUCTION_REALITY_MATRIX_2026-05-27.md`
- `scripts/audit-csp-headers.sh`
