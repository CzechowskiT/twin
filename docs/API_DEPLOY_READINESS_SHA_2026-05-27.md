# API deploy readiness — SHA diff (session 2)

**Branch:** `cursor/phase1-monorepo-scaffold`
**Repo HEAD:** `1efd8b1` (OAuth + job-save rate limits)
**Prod `public-health` git_commit (read-only):** `39dc076` (stale — pre-session deploy)

## Runtime deltas not yet live on Railway

| Area | Commit(s) | Needs deploy? |
| ---- | --------- | ------------- |
| Auth mutation caps (applications, profile, match-feedback) | `1c731fc` | Yes |
| Stripe dedup handler wire-up | `ff22f3a` | Yes (ledger idle until migration) |
| OAuth callback 10/min IP | `1efd8b1` | Yes |
| Job save/unsave 30/min user | `1efd8b1` | Yes |
| Alembic `050_stripe_webhook_events` | `921fb54` | **Migration** after deploy — founder approval |

## Recommendation

1. Wait for GitHub `smoke.yml` green on `1efd8b1`.
2. Let Railway auto-deploy from branch push (no manual env change).
3. Re-run `./scripts/verify-prod-health.sh` — expect `git_commit` ≥ `1efd8b1`.
4. **Do not** run Alembic `050` on prod until `docs/STRIPE_DEDUP_MIGRATION_RUNBOOK_2026-05-27.md` sign-off.

## Public launch

Still **NO-GO** — CSP enforce burn-in (S2), Stripe migration (S5), O7 drill log empty.
