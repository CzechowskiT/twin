# Founder smoke handoff — PRs #448, #449, #450 (2026-07-13)

> **Stance:** P0 CLOSED | Gate E PASS | Gate F PENDING | Launch NO-GO  
> **Smoke executed by agent:** **NO** — technical readiness only  
> **Hard bans:** no merge, no auto-merge, no fake PASS, no Wave C3

---

## Env names (SET/UNSET only — never log values)

| Variable | Purpose | Required for |
|----------|---------|--------------|
| `DEMO_USER_PASSWORD` | Candidate demo login (`demo@twin.career`) | Wave B B1/B2/B3 smoke |
| `RECRUITER_TOKEN` | Pilot recruiter API/browser auth | Wave C C1/C2 smoke |
| `TWIN_RECRUITER_TOKEN` | Alternate recruiter token env name | Wave C C1/C2 smoke |
| `TWIN_PREVIEW_URL_448` | #448 Vercel preview base URL | B3 referrals preview smoke |
| `TWIN_PREVIEW_URL_449` | #449 Vercel preview base URL | C1 activation preview smoke |
| `TWIN_PREVIEW_URL_450` | #450 Vercel preview base URL | C2 pool/trust preview smoke |

**Preflight (no secrets in output):**

```bash
cd frontend && npm run preflight:founder-smoke-env
cd frontend && npm run preflight:preview-reachability
cd frontend && npm run preflight:founder-smoke-orchestration
```

---

## Smoke order

1. **Preflight** — env SET/UNSET + prod/preview public-health reachability
2. **Wave B prod** — Career Compass (B1) + Trust Center (B2) on `https://twin-sooty.vercel.app` with `DEMO_USER_PASSWORD`
3. **Wave C preview #449** — C1 activation with recruiter token
4. **Merge #449** (founder) → rebase #450 → **C2 smoke on #450 preview**
5. **Merge #450** (founder) → rebase #448 → **B3 referrals smoke on #448 preview**
6. Record evidence in runbooks; add `FOUNDER_SMOKE: PASS` only when slices pass

---

## Routes

| Slice | PR | Routes | Auth |
|-------|-----|--------|------|
| B1 Career Compass | prod | `/dashboard/career` | `demo@twin.career` |
| B2 Trust Center | prod | `/dashboard/trust` | `demo@twin.career` |
| B3 Referrals | #448 | `/dashboard/referrals` | `demo@twin.career` |
| C1 Activation | #449 | `/recruiter`, `/recruiter/inbox` | Recruiter token |
| C2 Talent Pool | #450 | `/recruiter/talent-pool` | Recruiter token |
| C2 Trust Review | #450 | `/recruiter/trust-review-queue` | Recruiter token |

Public preflight routes (no auth): `/api/public-health`, `/`, `/login/candidate`, `/login/recruiter`

---

## Migration merge order

```
070_candidate_trust_center (scaffold)
  → 071_recruiter_workspace_activation (#449)
  → 072_recruiter_talent_pool_trust_review_c2 (#450)
  → 073_candidate_referrals (#448, rebase after #450)
```

**#448 alone:** migration 073 parent `072` not on branch until rebase after #450 merge — do not fake full-graph PASS on #448 in isolation.

---

## Evidence

Fill templates in:
- `docs/CANDIDATE_GREEN_MODULES_FOUNDER_SMOKE_2026-07-10.md` (Wave B)
- `docs/RECRUITER_WAVE_C_FOUNDER_SMOKE_2026-07-13.md` (Wave C)

Orchestration wrapper prints a combined evidence template:

```bash
cd frontend && npm run preflight:founder-smoke-orchestration
```

---

## Failure handling

| Failure | Action |
|---------|--------|
| Env UNSET | Stop — no browser smoke; do not record PASS |
| Preview unreachable | Check Vercel deploy; retry public-health only |
| Migration head conflict | Follow merge order #449 → #450 → rebase #448 |
| PILOT module shows LIVE | File bug — guards should block without PASS doc |
| Console errors on smoke | FAIL slice; do not merge that PR |

---

## PILOT status (unchanged until smoke PASS)

| Module | Status |
|--------|--------|
| Career Compass B1 | PILOT |
| Trust Center B2 | PILOT |
| Referrals B3 (#448) | PILOT |
| Recruiter activation C1 (#449) | PILOT |
| Talent pool C2 (#450) | PILOT |
| Trust review queue C2 (#450) | PILOT |

---

## Related docs

- `docs/INTEGRATION_READINESS_PR448_449_450_2026-07-13.md`
- `docs/CANDIDATE_GREEN_MODULES_FOUNDER_SMOKE_2026-07-10.md`
- `docs/RECRUITER_WAVE_C_FOUNDER_SMOKE_2026-07-13.md`
- `docs/ALL_WORKSPACE_MODULES_ACTIVATION_MASTER_PLAN_2026-07-10.md`

---

## Guards (run before smoke)

```bash
cd frontend && npm run test:alembic-duplicate-revision-guard
cd frontend && npm run test:candidate-green-modules-founder-smoke-guard
cd frontend && npm run test:recruiter-wave-c-founder-smoke-guard
cd frontend && npm run test:all-modules-green-wave-b3-referrals-guard  # on #448 branch
```
