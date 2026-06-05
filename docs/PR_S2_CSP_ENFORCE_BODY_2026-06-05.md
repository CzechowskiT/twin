# S2 CSP enforce after clean 72h burn-in

**Branch:** `chore/s2-csp-enforce-pr-2026-06-05`
**Base:** `cursor/phase1-monorepo-scaffold`
**Source rollup:** `chore/s2-csp-burnin-readiness-2026-06-01` @ `9074150`
**Founder decision:** Recommendation A — separate enforce PR — **merged PR #32 @ `6862999` + Vercel deployed**

---

## Summary

Minimal security change: rename the Next.js static header key from `Content-Security-Policy-Report-Only` to `Content-Security-Policy` in `frontend/next.config.ts`. **Policy string unchanged** — same narrowed host allowlists validated during 72h report-only burn-in (`2026-06-02T14:18:33Z` → `2026-06-05T14:18:33Z`).

Supporting updates:

- `frontend/scripts/security-headers.test.ts` — enforce-mode expectations
- `frontend/e2e/smoke.spec.ts` — runtime header check uses enforce CSP
- `scripts/audit-csp-headers.sh` — post-deploy audit expects CSP-E=yes, CSP-RO=no
- S2 docs — enforce PR merged + deployed; post-enforce smoke **PASS**

**Production (`https://twin-sooty.vercel.app`):** CSP enforce **ON** since PR #32 deploy.

## Burn-in evidence (rollup `9074150`)

| Gate | Status |
| ---- | ------ |
| 72h report-only window | ✅ COMPLETE |
| Railway `csp_report` | ✅ CLEAN — no fresh entries since window start |
| Multi-browser DevTools | ✅ PASS — Chrome, Safari, Firefox |
| 8-route header audit (pre-enforce prod) | ✅ CSP-RO + report-uri |
| Logo / homepage smoke | ✅ PASS (non-CSP) |
| CSP sink tests | ✅ 9 passed |

Full pack: `docs/S2_CSP_ENFORCE_READINESS_2026-06-01.md`, `docs/S2_CSP_BURNIN_WINDOW_2026-06-01.md`.

## What changed in production (after merge + deploy)

Browsers **block** CSP violations instead of only reporting them. Same directives; enforcement is the behavioral difference.

Rollback: revert header key to `Content-Security-Policy-Report-Only` and redeploy frontend (< 5 min). See `docs/S2_CSP_ENFORCE_READINESS_2026-06-01.md` § Rollback plan.

## Hard bans honoured (this PR session)

- ✅ No backend policy changes
- ✅ No CSP relaxation or broad refactor
- ✅ No public launch GO claim

## Test plan

- [x] `npm run test:security-headers` — enforce mode in `next.config.ts`
- [x] `pytest tests/test_csp_report.py tests/test_csp_report_sanitization.py` — 9 passed (unchanged backend)
- [x] `npm run lint` + `npx tsc --noEmit` + `npm run build`
- [x] `bash scripts/audit-csp-headers.sh` against prod — CSP-E=yes on 8 routes (post-deploy)
- [x] Post-merge: founder deploy frontend only → re-run audit (CSP-E=yes on 8 routes)
- [x] Post-deploy smoke: `docs/S2_CSP_ENFORCE_READINESS_2026-06-01.md` § Post-enforce smoke — S2 PASS
  - Manual routes: `/`, `/dashboard`, `/login/candidate`, `/register/candidate`, `/demo`, `/status`, `/dashboard/calendar`, `/api/public-health`
  - Homepage/logo smoke OK
  - Railway `csp_report` — brak świeżych wpisów post-enforce
  - `GET /api/public-health` → `status=ok`

## Founder actions required

1. ~~Review this PR and burn-in evidence pack.~~
2. ~~**Approve merge** when satisfied.~~
3. ~~**Deploy frontend only** (Vercel — no Railway change).~~
4. ~~Run post-enforce smoke checklist; monitor Railway `csp_report` for 24h.~~
5. ~~S2 PASS recorded — separate founder sign-off.~~

**S2 verdict after deploy:** ✅ **S2 PASS** · Public launch **NO-GO** · Enforce **ON** on prod.

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

Monitor Railway `csp_report` for **24h** after enforce deploy (`2026-06-05T16:20:13Z` → `2026-06-06T16:20:13Z`). Triage any fresh `blocked-uri` per `docs/S2_CSP_RAILWAY_LOG_TRIAGE_PLAN_2026-06-01.md`. Rollback trigger: broken pages or report spike — revert to Report-Only per `docs/S2_CSP_ENFORCE_READINESS_2026-06-01.md` § Rollback plan.
