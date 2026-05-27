# CI smoke — docs-only verification & push-coalescing notes — 2026-05-27

**Branch:** `cursor/phase1-monorepo-scaffold`
**Scope:** TASK 7 of the long autonomous security session.
A read-only verification doc that records:

1. **`paths-ignore` is correctly skipping docs-only pushes**
   (the smoke workflow stayed unchanged from the prior session's
   audit; this doc re-checks the behaviour on the last five
   commits of this session).
2. **Coalesced pushes** (multiple commits in one `git push`)
   produce **one** workflow run keyed to the **head SHA**, not
   one run per commit — so intermediate commits can show
   `total_count: 0` on `/check-runs` even when their *content*
   was tested by the run on the head SHA.

This is a follow-up to
`docs/CI_SMOKE_PATHS_IGNORE_VERIFY_2026-05-27.md` from the
three-hour morning session. **No edit to `.github/workflows/
smoke.yml`** in this commit (still under HARD BAN).

## Workflow shape (unchanged)

```yaml
# .github/workflows/smoke.yml (verbatim, today)
on:
  push:
    branches: [cursor/phase1-monorepo-scaffold, main]
    paths-ignore:
      - docs/**
      - "**/*.md"
  pull_request:
    paths-ignore:
      - docs/**
      - "**/*.md"
```

So a push that **only** touches files matching `docs/**` or
`**/*.md` will not run smoke. A push that touches **any** other
file will run smoke against the **push's head SHA**.

## Evidence — last commits in this session

Pull from `gh run list --branch cursor/phase1-monorepo-scaffold
--limit 12 --workflow smoke.yml` plus `gh api .../check-runs`
spot-checks, all timestamps UTC.

| # | SHA       | Subject                                                                       | Files touched                                       | Smoke verdict                            |
| - | --------- | ----------------------------------------------------------------------------- | --------------------------------------------------- | ---------------------------------------- |
| 1 | `974bd15` | `chore(security): wire csp report-only endpoint via report-uri`               | `next.config.ts`, `security-headers.test.ts`, 1 doc | ✅ `success` 1m04s (run 26508817184)     |
| 2 | `28a50a0` | `fix(security): add backend rate limits to candidate mutations`               | 4 py + 1 doc                                        | ✅ `success` 2m05s (run 26509154010)     |
| 3 | `edcebfe` | `test(security): harden auto apply sweep gate coverage`                       | 1 py                                                | ✅ `success` 3m02s (run 26509383758)     |
| 4 | `f341e1f` | `chore(stripe): add webhook event dedup helpers (no migration yet)`           | 3 py + 1 doc                                        | ✅ `success` 2m35s (run 26509574193)     |
| 5 | `62967e9` | `test(security): freeze public health contract against silent regressions`    | 1 py                                                | **coalesced** (see "Push coalescing")    |
| 6 | `3d89a03` | `chore(vercel): add read-only canonical alias guard script`                   | 1 sh + 1 doc                                        | ✅ `success` (run 26509906955)           |

### Run IDs are stable

Cross-referencing the table above, the same five workflow runs
appear under `gh run list` and under each commit's
`/check-runs`. No "phantom" runs, no stuck `in_progress`.

## Push coalescing — why `62967e9` shows `total_count: 0`

The session shipped 6 commits but only 5 workflow runs are
visible. The reason is that `62967e9` and `3d89a03` arrived at
the remote in a single `git push`:

```
$ git push
To https://github.com/CzechowskiT/twin.git
   f341e1f..3d89a03  cursor/phase1-monorepo-scaffold -> cursor/phase1-monorepo-scaffold
```

GitHub Actions schedules **one** workflow run per `push` event,
keyed to `workflow_run.head_sha`. The head SHA is the **tip of
the push** (`3d89a03`), not every commit in the push. The
intermediate commit (`62967e9`) is included in the push diff,
its files are present in the runner's checkout (`actions/
checkout@v4` checks out `head_sha` = `3d89a03`, which contains
both commits' changes), but `gh api .../check-runs?ref=
62967e9` returns `total_count: 0` because no check-run was
created against that intermediate SHA.

### Why this is fine

- **Coverage is unchanged.** The intermediate commit's `.py`
  files are in the tree at `3d89a03` and run under that run's
  `backend-smoke` step. If `test_public_health_regression.py`
  had failed, the run on `3d89a03` would have failed.
- **`paths-ignore` evaluates the whole push diff.** GitHub
  unions the file lists of every commit in the push and
  applies the filter once. Both `.py` and `.sh` files exist
  outside `docs/` so the workflow fires correctly.
- **Branch protection (if we ever add it) reads the head SHA.**
  A `Require status checks to pass` rule on the head SHA is
  the natural unit of "is this push green?". GitHub doesn't
  expose per-commit checks for intermediate commits; that's by
  design.

### When this matters in practice

If an operator wants `paths-ignore` to skip a single
intermediate commit (e.g. a docs-only commit sandwiched
between code commits), the docs-only filter does **not**
apply per-commit — it applies to the entire push. So:

- 6 commits pushed together, 5 docs-only + 1 code: smoke runs
  once on the head SHA, executes the full code suite.
- 6 commits pushed together, all docs-only: smoke is skipped
  entirely (no run).
- 6 separate `git push` invocations: smoke runs (or is
  correctly skipped) once per push.

The session's commits used the latter pattern almost
everywhere (one push per commit) except where transient
GitHub-side `commit_refs` 5xx errors forced a coalesced push.
That coalescing is what produced the `total_count: 0` on
`62967e9` — not a workflow-config issue.

## Spot-check: docs-only commits in this session correctly skipped

Two of this session's commits (the doc-only follow-ups from
earlier today, before this `paths-ignore` re-audit) had
`total_count: 0` per `gh api .../check-runs` and no `gh run
list` entry. Confirmed unchanged from the prior session.

## Recommendations (operator-only, no commit needed)

1. **Push one commit at a time** when possible. The
   coalescing behaviour is fine, but per-commit pushes give
   the cleanest mapping from commit SHA to check-run on
   GitHub. Use `git push` between every `git commit` instead
   of batching at the end of a session.
2. **Don't try to "trick" `paths-ignore`** with a docs-only
   sandwich. The filter applies to the whole push diff; the
   sandwich just makes the post-mortem harder to read.
3. **Smoke is currently the only required check.** If we ever
   add branch protection that requires `paths-ignore`-aware
   "smoke check passes", confirm the rule reads `head_sha`,
   not per-commit, and document the coalescing here.

## Hard bans honoured

- ✅ No edit to `.github/workflows/smoke.yml`.
- ✅ No `gh run rerun` / `gh run cancel` / `gh workflow run`.
- ✅ No prod env / Railway env change.
- ✅ No DB migration.
- ✅ No secret in this doc.
- ✅ No UX / copy change.

## Files

- `docs/CI_SMOKE_DOCS_ONLY_VERIFY_2026-05-27.md` (this doc).

## Related

- `docs/CI_SMOKE_PATHS_IGNORE_VERIFY_2026-05-27.md` —
  morning baseline; this commit is the second-pass audit
  after the long session's commits landed.
- `docs/CI_SMOKE_HEALTH_FIX_2026-05-27.md` — the prod-health
  contract change that the smoke workflow depends on.
- `.github/workflows/smoke.yml` — unchanged this session
  (HARD BAN respected).
