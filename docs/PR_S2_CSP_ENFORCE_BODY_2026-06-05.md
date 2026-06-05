# S2 CSP enforce after clean 72h burn-in

**Branch:** `chore/s2-csp-enforce-pr-2026-06-05`
**Base:** `cursor/phase1-monorepo-scaffold`
**Source rollup:** `chore/s2-csp-burnin-readiness-2026-06-01` @ `9074150`
**Founder decision:** Recommendation A — separate enforce PR (prepared; **not merged**)

---

## Summary

Minimal security change: rename the Next.js static header key from `Content-Security-Policy-Report-Only` to `Content-Security-Policy` in `frontend/next.config.ts`. **Policy string unchanged** — same narrowed host allowlists validated during 72h report-only burn-in (`2026-06-02T14:18:33Z` → `2026-06-05T14:18:33Z`).

Supporting updates:

- `frontend/scripts/security-headers.test.ts` — enforce-mode expectations
- `frontend/e2e/smoke.spec.ts` — runtime header check uses enforce CSP
- `scripts/audit-csp-headers.sh` — post-deploy audit expects CSP-E=yes, CSP-RO=no
- S2 docs — enforce PR prepared; prod still report-only until merge + deploy

**This PR does not deploy.** Production (`https://twin-sooty.vercel.app`) remains report-only until founder merges and Vercel redeploys the frontend.

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

## What changes in production (after merge + deploy only)

Browsers will **block** CSP violations instead of only reporting them. Same directives; enforcement is the behavioral difference.

Rollback: revert header key to `Content-Security-Policy-Report-Only` and redeploy frontend (< 5 min). See `docs/S2_CSP_ENFORCE_READINESS_2026-06-01.md` § Rollback plan.

## Hard bans honoured (this PR session)

- ✅ No merge, deploy, env, Railway, DB, migrations
- ✅ No backend policy changes
- ✅ No CSP relaxation or broad refactor
- ✅ No S2 PASS or public launch GO claim

## Test plan

- [x] `npm run test:security-headers` — enforce mode in `next.config.ts`
- [x] `pytest tests/test_csp_report.py tests/test_csp_report_sanitization.py` — 9 passed (unchanged backend)
- [x] `npm run lint` + `npx tsc --noEmit` + `npm run build`
- [ ] `bash scripts/audit-csp-headers.sh` against prod — **expected FAIL until deploy** (prod still CSP-RO)
- [ ] Post-merge: founder deploy frontend only → re-run audit (expect CSP-E=yes on 8 routes)
- [ ] Post-deploy smoke: `docs/S2_CSP_ENFORCE_READINESS_2026-06-01.md` § Post-enforce smoke
  - Manual routes: `/`, `/dashboard`, `/login/candidate`, `/register/candidate`, `/demo`, `/status`, `/dashboard/calendar`
  - Google Calendar OAuth + events
  - Cookie consent → Plausible/PostHog without CSP console errors
  - `GET /api/public-health` → `status=ok`

## Founder actions required

1. Review this PR and burn-in evidence pack.
2. **Approve merge** when satisfied (agent does not merge).
3. **Deploy frontend only** (Vercel — no Railway change).
4. Run post-enforce smoke checklist; monitor Railway `csp_report` for 24h.
5. Only then consider S2 PASS (separate founder sign-off).

**S2 verdict after this PR (pre-deploy):** NOT S2 PASS · Public launch NO-GO · Enforce OFF on prod until deploy.
