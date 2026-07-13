# Rollback decision — PRs #448, #449, #450 (2026-07-13)

> **Status:** CURRENT  
> **Guard:** `npm run test:rollback-decision-guard`  
> **Stance:** No automatic production downgrade

---

## Per-PR rollback matrix

| PR | Migration | Rollback trigger | Action | Data loss risk |
|----|-----------|------------------|--------|----------------|
| #449 | `071_recruiter_workspace_activation` | C1 smoke FAIL after merge | Revert commit; **no** auto downgrade | Low — new tables only |
| #450 | `072_recruiter_talent_pool_trust_review_c2` | C2 smoke FAIL / migration error | Stop deploy; restore Railway backup | Medium — pool records |
| #448 | `073_candidate_referrals` | B3 smoke FAIL / duplicate rev | Revert before merge if 073 conflicts | Low if merged last |

## Decision rules

1. **Never** run `alembic downgrade` on production without founder approval
2. Failed migration during deploy → **stop**, restore backup per `PERSISTENCE_MIGRATION_RUNBOOK_2026-06-19.md`
3. Merge order 449→450→448 minimizes rollback blast radius
4. #448 rollback does not require downgrading 071/072 if reverted alone (revert commit only)

## Launch stance

Rollback docs do **not** imply Launch GO. Public launch remains **NO-GO**.

## Hard bans

- No LIVE flip on rollback
- No Stripe/ATS/MS Calendar rollback paths in this batch
- Phase 3B remains BLOCKED
