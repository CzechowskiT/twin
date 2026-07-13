# Rebase rehearsal playbook — PRs #451–#455 (2026-07-13)

> **Path:** B (dry-run only) · **Credentials:** UNSET · **No merges**

---

## Preconditions

- Scaffold `c2a08b025ca950b341540f0bc80f710825c778ce`
- #449 → #450 → #448 merged (or sim-verified on temp branch)
- `074_recruiter_notification_preferences_c3` `down_revision` currently `072` on open PRs — **must become `073`** after #448

---

## Exact commands (rehearsal — do not push force to main)

### 1. Sync remotes

```bash
git fetch origin \
  chore/extended-integration-batch-2026-07-13 \
  feat/all-modules-green-wave-c3-notification-prefs \
  feat/all-modules-green-wave-c4-saved-views \
  feat/all-modules-green-wave-c5-activity-timeline \
  feat/all-modules-green-wave-candidate-activity-timeline
```

### 2. Rebase #451 tooling onto post-C2 main (after #450 merge in real train)

```bash
git checkout chore/extended-integration-batch-2026-07-13
git rebase origin/main   # or merged C2 branch tip
npm run test:integration-tooling-guards
git push --force-with-lease origin chore/extended-integration-batch-2026-07-13
```

### 3. Rebase #452 C3 — fix migration parent 072 → 073

```bash
git checkout feat/all-modules-green-wave-c3-notification-prefs
git rebase origin/feat/all-modules-green-wave-b3-candidate-referrals
# Edit backend/alembic/versions/074_recruiter_notification_preferences_c3.py:
#   down_revision = "073_candidate_referrals"
sed -i '' 's/072_recruiter_talent_pool_trust_review_c2/073_candidate_referrals/' \
  backend/alembic/versions/074_recruiter_notification_preferences_c3.py
cd backend && python3 -m pytest tests/test_recruiter_c3_notification_prefs.py -q
cd ../frontend && npm run test:all-modules-green-wave-c3-notification-prefs-guard
git add backend/alembic/versions/074_recruiter_notification_preferences_c3.py
git commit --amend --no-edit
git push --force-with-lease origin feat/all-modules-green-wave-c3-notification-prefs
```

### 4. Stack #453 on merged #452

```bash
git checkout feat/all-modules-green-wave-c4-saved-views
git rebase origin/feat/all-modules-green-wave-c3-notification-prefs
cd backend && python3 -m pytest tests/test_recruiter_c4_saved_views.py -q
git push --force-with-lease origin feat/all-modules-green-wave-c4-saved-views
```

### 5. Stack #454 on merged #453

```bash
git checkout feat/all-modules-green-wave-c5-activity-timeline
git rebase origin/feat/all-modules-green-wave-c4-saved-views
cd backend && python3 -m pytest tests/test_recruiter_c5_activity_timeline.py -q
git push --force-with-lease origin feat/all-modules-green-wave-c5-activity-timeline
```

### 6. Stack #455 candidate timeline on #454

```bash
git checkout feat/all-modules-green-wave-candidate-activity-timeline
git rebase origin/feat/all-modules-green-wave-c5-activity-timeline
cd backend && python3 -m pytest tests/test_candidate_activity_timeline.py -q 2>/dev/null || true
git push --force-with-lease origin feat/all-modules-green-wave-candidate-activity-timeline
```

### 7. Verify single head 077

```bash
npm run sim:integration-070-077:dry-run
npm run test:alembic-duplicate-revision-guard
```

---

## Merge order (when Path A + smoke PASS)

```
#449 → #450 → rebase #448 → #448 → #451 → rebase/fix #452 → #452 → #453 → #454 → #455
```

#451 is **tooling-only** — merge allowed without product smoke if repo policy + CI green; **no** auto-merge in agent batch.

---

## Rollback

See `docs/ROLLBACK_DECISION_PR448_449_450_2026-07-13.md` and `npm run test:rollback-engine-v2`.

**Never** `alembic downgrade` on production.

---

## Stance

Launch **NO-GO** · Gate F **PENDING** · Phase 3B **BLOCKED**
