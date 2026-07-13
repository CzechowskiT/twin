# Final release train rebase playbook — PRs #448–#460 (2026-07-13)

> **Path:** B++ rehearsal (credentials UNSET) · **No auto-merge** · **No fake smoke PASS**

---

## Train overview

```
scaffold c2a08b0 (070)
  → #449 (071) C1 recruiter activation
  → #450 (072) C2 talent pool + trust review
  → #448 (073) B3 candidate referrals  ← renumber + rebase required
  → #451 (tooling, no migration)
  → #452 (074) C3 notification prefs   ← down_revision fix 072→073
  → #453 (075) C4 saved views
  → #454 (076) C5 recruiter activity timeline
  → #455 (077) candidate activity timeline
  → #456–#460 (hardening, parallel to scaffold)
```

**Single Alembic head target:** `077_candidate_activity_timeline`

---

## Simulation evidence (batch 2026-07-13)

| Check | Result |
|-------|--------|
| `npm run sim:integration-070-077` | **PASS** @ `c3d35c0` |
| Migration chain | 070→071→072→073→074→075→076→077 |
| Conflicts resolved in sim | #448 (4 files), #451 (1), #452 (2) |
| Backend persistence tests | PASS on sim branch |
| Frontend guards | PASS on sim branch |

Report: `reports/integration-sim/integration-sim-*.json`

---

## #448 conflict resolver

**Issue:** #448 and #449 both claimed `071_*`.

**Resolution (on #448 branch):**
- Renumber `071_candidate_referrals` → `073_candidate_referrals`
- `down_revision = 072_recruiter_talent_pool_trust_review_c2`
- Rebase onto merged #449 + #450 before merge

Tooling: `npm run test:pr448-conflict-resolver`

---

## #452 fix — migration parent 072 → 073

**Current on open PR #452:** `074_recruiter_notification_preferences_c3` has `down_revision = 072_recruiter_talent_pool_trust_review_c2`

**Required after #448 merge:**

```bash
git fetch origin feat/all-modules-green-wave-c3-notification-prefs
git checkout feat/all-modules-green-wave-c3-notification-prefs
git rebase origin/main   # after #448 merged

# Fix migration parent
sed -i '' 's/072_recruiter_talent_pool_trust_review_c2/073_candidate_referrals/' \
  backend/alembic/versions/074_recruiter_notification_preferences_c3.py

cd backend && python3 -m pytest tests/test_recruiter_c3_notification_prefs.py -q
cd ../frontend && npm run test:all-modules-green-wave-c3-notification-prefs-guard
git add backend/alembic/versions/074_recruiter_notification_preferences_c3.py
git commit --amend --no-edit   # or new commit if policy requires
git push --force-with-lease origin feat/all-modules-green-wave-c3-notification-prefs
```

**PR status:** CONFLICTING — resolve via rebase after #448 lands.

---

## Stack rebases (#453–#455)

```bash
# After #452 merged
git checkout feat/all-modules-green-wave-c4-saved-views
git rebase origin/feat/all-modules-green-wave-c3-notification-prefs
# pytest + guard + push --force-with-lease

# Repeat for #454 on #453, #455 on #454
```

---

## #451 tooling branch

Merge after #450 (or after full #448–#450 block). Rebases onto merged C2:

```bash
git checkout chore/extended-integration-batch-2026-07-13
git rebase origin/main
npm run test:integration-tooling-guards
git push --force-with-lease
```

---

## Hardening #456–#460

Parallel docs+guards; no migrations. Merge after #451 or in parallel to scaffold — **no product dependency**.

| PR | Guard |
|----|-------|
| #456 | `test:hardening-pilot-readiness-dashboard-guard` |
| #457 | `test:hardening-workspace-suspension-guard` |
| #458 | `test:hardening-privacy-request-tracker-guard` |
| #459 | `test:hardening-feature-flag-audit-guard` |
| #460 | `test:hardening-retention-preview-guard` |

---

## Merge gates (all require smoke when credentials SET)

| PR | Gate |
|----|------|
| #449 | C1 smoke PASS + CI green |
| #450 | #449 merged + C2 smoke PASS |
| #448 | B3 referrals smoke + rebase after #450 |
| #451 | Tooling CI green (no product smoke) |
| #452–#455 | Prior merged + rebase + wave smoke PASS |
| #456–#460 | CI green; no LIVE flips |

---

## Verification after full train

```bash
npm run sim:integration-070-077
npm run test:alembic-duplicate-revision-guard
npm run test:release-train-v4
cd backend && alembic heads   # expect single head 077
```

---

## Rollback

- **Never** `alembic downgrade` on production
- Failed migration → stop deploy + Railway backup restore
- See `docs/ROLLBACK_DECISION_PR448_449_450_2026-07-13.md`

**Playbook stance:** Rehearsal **PASS** · Product merges **BLOCKED** until founder smoke (Path A).
