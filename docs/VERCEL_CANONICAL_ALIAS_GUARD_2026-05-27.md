# Vercel canonical alias guard — 2026-05-27

**Branch:** `cursor/phase1-monorepo-scaffold`
**Scope:** TASK 6 of the long autonomous security session.
Ships a **read-only** local guard
(`scripts/check-vercel-canonical-alias.sh`) that flags drift
between `frontend/.vercel/project.json` and the canonical
project / org documented in
`docs/VERCEL_CANONICAL_DEPLOY_RUNBOOK_2026-05-27.md`.

The guard never edits `.vercel/`, never calls `vercel link`,
never runs `vercel deploy`, never touches the public alias.
It is **diagnostic only**.

## Why we need a guard

The morning runbook captured the drift state:

```
$ cat frontend/.vercel/project.json
{"projectId":"prj_vN6xFbdufM5rRp86lPVB1rQm2FTp",
 "orgId":"team_kRoghq6m6ogPUxpuwDUongpN",
 "projectName":"twin-sooty"}
```

The canonical project that owns `twin-sooty.vercel.app` is
**`twin`**, not `twin-sooty` (the latter is a sibling Vercel
project with no recent prod deploys). The day-to-day push
deploy works fine because the Git → Vercel hook is wired on
the **`twin`** project independently of the local link.

The risk is **any future `npx vercel deploy` from
`frontend/`**: with the wrong local link, it ships to
`twin-sooty` instead of `twin` — i.e. to a project whose
build output **does not get aliased** onto
`twin-sooty.vercel.app`. The deploy "looks fine" in the
Vercel UI (status: Ready) but users see the **previous**
`twin` deployment until the canonical alias is re-aliased
manually.

This guard surfaces the drift the moment an operator runs it,
without flipping any state.

## How to run

From the repo root:

```
# Warn-only mode — prints diagnostic, always exits 0.
bash scripts/check-vercel-canonical-alias.sh

# Strict mode — exits 1 on drift. Use from a personal pre-push
# hook only; CI does not need it.
bash scripts/check-vercel-canonical-alias.sh --strict
```

Output on the current drift state (this branch):

```
[vercel-canonical] Reading frontend/.vercel/project.json
                    projectName=twin-sooty
                    orgId=team_kRoghq6m6ogPUxpuwDUongpN
[vercel-canonical] DRIFT — local link projectName='twin-sooty' but canonical='twin'

[vercel-canonical] To fix the drift (open maintenance window first):

  cd frontend
  rm -rf .vercel
  npx vercel link --scope=twin --project=twin --yes
  git add .vercel/project.json
  git commit -m "chore(vercel): re-link frontend to canonical 'twin' project"
```

In `--strict` mode the same body prints and the script exits
1 so a `git push` invoked from a pre-push hook would abort.

## Why this commit doesn't fix the drift

- **No `vercel link` / `vercel deploy` allowed.** Hard bans
  this session (no Vercel state change). Fixing the drift
  rewrites `frontend/.vercel/project.json` and a CLI re-link
  flips which Vercel project the next `vercel deploy` would
  hit. That's a real-prod operation, gated on a maintenance
  window with a human watching `curl twin-sooty.vercel.app`.
- The guard alone is **zero-risk**: it `cat`s a JSON file and
  prints a verdict. No `.vercel/` edit, no CLI call.

## Suggested adoption (operator-only, opt-in)

```
# Personal pre-push hook for the founder / ops, in ~/.gitconfig or
# .git/hooks/pre-push (do not commit a hook to the repo):
bash scripts/check-vercel-canonical-alias.sh --strict
```

CI does not run this; CI does not need a Vercel link.

## Why bash and not Python

Other guard scripts in `scripts/` are bash (`verify-prod-
health.sh`, `verify-deploy.sh`, `run-production-audit.sh`).
Reusing the same lingua franca keeps the operator's toolbox
consistent. The script does shell out to `python3` to parse
the JSON (no `jq` dependency).

## Hard bans honoured

- ✅ No `vercel link` / `vercel deploy` / `vercel alias` run.
- ✅ No `.vercel/` edit.
- ✅ No alias swap.
- ✅ No prod env / Railway env change.
- ✅ No DB migration.
- ✅ No secret in code or docs.
- ✅ No UX / copy change.
- ✅ Script never edits anything; the only effect is `stdout`.

## Files

- `scripts/check-vercel-canonical-alias.sh` (new, executable).
- `docs/VERCEL_CANONICAL_ALIAS_GUARD_2026-05-27.md` (this doc).

## Related

- `docs/VERCEL_CANONICAL_DEPLOY_RUNBOOK_2026-05-27.md` —
  canonical mapping; this guard mirrors that doc's
  "Drift" section.
- `docs/VERCEL_PRODUCTION_BRANCH.md` — older runbook (says
  `projectName = twin-sooty`); the guard logs the same
  drift the runbook documents.
- `docs/DEPLOY_VERIFICATION_CHECKLIST.md` — runs the guard
  before a controlled alias swap.
