# Migration & release train decision — revisions 070–077 (2026-07-13)

> **Decision owner:** engineering batch (Path B — no founder credentials)  
> **Stance:** P0 CLOSED · Gate E PASS · Gate F PENDING · Launch **NO-GO**

---

## Chosen strategy

**Merge order (single release train):**

```
scaffold c2a08b0
  → #449 (071) → #450 (072) → #448 (073)
  → #451 (tooling, no migration)
  → #452 C3 (074) → #453 C4 (075) → #454 C5 (076) → #455 candidate (077)
```

**Rationale:** #448 owns migration `073_candidate_referrals` and must land **before** C3–C5. C3–C5 were stacked on #450 (`072`) during development; at merge time each wave branch **rebases onto the prior merged PR** and `074`’s `down_revision` must be updated from `072` → `073` when rebasing C3 after #448.

**Not chosen:** Renumbering 074–077 to skip 073 — rejected (higher churn, breaks open PR SHAs, duplicate revision risk).

---

## Migration graph (target single head)

| Rev | File (pattern) | Source PR | down_revision |
|-----|------------------|-----------|---------------|
| 070 | `candidate_trust_center` | scaffold | 069 |
| 071 | `recruiter_workspace_activation` | #449 | 070 |
| 072 | `recruiter_talent_pool_trust_review_c2` | #450 | 071 |
| 073 | `candidate_referrals` | #448 | 072 |
| 074 | `recruiter_notification_preferences_c3` | #452 | **073** (rebase fix) |
| 075 | `recruiter_saved_views_c4` | #453 | 074 |
| 076 | `recruiter_activity_timeline_c5` | #454 | 075 |
| 077 | `candidate_activity_timeline` | #455 | 076 |

**Single head:** `077_candidate_activity_timeline`

---

## Evidence

| Check | Result |
|-------|--------|
| #448 renumber 071→073 | Applied on branch `5c3c4825` |
| C3 `074` down_revision on open PR | `072` — **must fix on rebase after #448** |
| Integration sim 448–450 (prior batch) | PASS @ temp merge, head `073` |
| C3–C5 CI failures (this batch) | Leaked cross-wave routes in `recruiter.py` — fixed, rebased stack |
| Full 070–077 fixture | `waveStack077Fixture()` in `alembic-migration-graph.ts` |

---

## #451 rebase

After #450 merges, rebase `#451` onto merged C2 branch before opening C3 merge. #451 adds tooling only (no Alembic file).

---

## Rollback

No automatic `alembic downgrade` on production. Failed migration → stop deploy, Railway backup restore per `docs/PERSISTENCE_MIGRATION_RUNBOOK_2026-06-19.md`.

---

## Merge gates (all OPEN)

| PR | Merge when |
|----|------------|
| #449–#448 | Wave B/C1/C2 smoke PASS + CI green |
| #451 | #450 merged + tooling CI green |
| #452–#455 | Prior wave merged + rebase + dedicated smoke PASS + CI green |

**This batch:** no product PRs merged.
