# Conflict resolution contract — PR #448 merge (2026-07-13)

> **Scope:** deterministic merge of `feat/all-modules-green-wave-b3-candidate-referrals` onto scaffold + #449 + #450  
> **Tool:** `frontend/scripts/lib/pr448-conflict-resolver.ts`  
> **Guard:** `npm run test:pr448-conflict-resolver`

---

## Known conflict files (4)

When merging #448 after #449→#450 on temp branch `tmp/integration-pr448-449-450-verify`:

| # | Path | Strategy |
|---|------|----------|
| 1 | `frontend/package.json` | **Union** `scripts` test entries — keep both C2 and B3 `test:*` keys; sort keys alphabetically |
| 2 | `frontend/src/lib/all-workspace-modules-activation.ts` | **Merge by `id`** — union `WORKSPACE_MODULE_ACTIVATION` entries; preserve C2 recruiter modules + B3 `candidate_referrals` |
| 3 | `frontend/scripts/candidate-green-modules-founder-smoke-guard.test.ts` | **Union** — keep C2 smoke assertions + B3 referrals assertions (both `test()` blocks) |
| 4 | `docs/ALL_WORKSPACE_MODULES_ACTIVATION_MASTER_PLAN_2026-07-10.md` | **Append** — retain C2 Wave C slice 2 section; append B3 referrals slice if absent |

**Not auto-resolved (manual review if present):** `frontend/src/lib/i18n.ts`, `backend/app/database/models.py` — usually clean merge; if conflict, abort sim and file issue.

---

## Resolution invariants

1. Migration `073_candidate_referrals` must remain with `down_revision = 072_recruiter_talent_pool_trust_review_c2`
2. No duplicate Alembic revision IDs after resolution
3. `REFERRALS_SHIP_STATUS` stays `PILOT` until founder smoke PASS
4. C2 `RECRUITER_TALENT_POOL_SHIP_STATUS` unchanged by B3 merge
5. Launch stance **NO-GO** in all merged docs

---

## CLI usage

```bash
# Dry-run contract validation (no git)
npm run test:pr448-conflict-resolver

# Integration sim applies resolver on #448 conflict
npm run sim:integration-070-077
```

---

## Evidence

| Run | Result | Notes |
|-----|--------|-------|
| Manual merge 2026-07-13 | PASS @ `6ed56afd` | Prior batch — branch deleted |
| Resolver unit tests | PASS | Contract locked |
| Extended sim 070–077 | See `reports/integration-sim/` | Path B batch |

---

## Hard bans

- No product PR merge without smoke PASS
- No fake conflict resolution (must pass fixture tests)
- No `alembic downgrade` on production
