# Vercel Canonical Deploy Runbook — 2026-05-27

TASK 3 of the 2026-05-27 morning release-hygiene run.
Tightens the **canonical deploy story** for TWIN into a single
sheet a release engineer (or the founder) can act on without
re-deriving the project ↔ alias mapping every time. Supersedes
`docs/VERCEL_PROJECT_ALIAS_RUNBOOK_2026-05-26.md` as the
day-to-day reference and folds in this run's fresh Vercel
inspect / `ls` evidence.

This doc is **documentation only**. No env / link / alias /
deploy change is performed by this commit.

## Canonical mapping (memorise this)

| Layer                           | Value                                                                                 |
| ------------------------------- | ------------------------------------------------------------------------------------- |
| **Public alias** (candidates)   | `https://twin-sooty.vercel.app`                                                       |
| **Public alias** (branch)       | `https://twin-git-cursor-phase1-monorepo-scaffold-twin.vercel.app`                    |
| **Vercel project owning alias** | `twin`  (team scope `twin`, root dir `frontend`, prod branch `cursor/phase1-monorepo-scaffold`) |
| **Vercel team / org**           | `twin`  (`team_kRoghq6m6ogPUxpuwDUongpN`)                                             |
| **Production branch on GitHub** | `cursor/phase1-monorepo-scaffold`                                                     |
| **Production branch on `main`** | None today (intentional — `main` is not the prod branch)                              |
| **Local `.vercel/project.json`**| Points at the **`twin-sooty`** project (drift; harmless for the Git-deploy path; see "Drift" below) |
| **Auto-deploy trigger**         | Push to `cursor/phase1-monorepo-scaffold` → Vercel Git hook → `twin` project builds → `twin-sooty.vercel.app` alias updated |

## Day-to-day deploy (the only one you should use)

This is **the canonical deploy** for Phase 1. There is no
production CLI deploy. There is no manual alias swap. There is
no Vercel UI deploy. There is **only `git push`**.

```
# 1. From repo root:
$ cd /Users/tomek/Projects/twin
$ git checkout cursor/phase1-monorepo-scaffold
$ git pull --ff-only origin cursor/phase1-monorepo-scaffold

# 2. Local gates (must pass before push):
$ cd frontend
$ npm run lint && npx tsc --noEmit && npm run build

# 3. Commit + push (small, atomic, narrative commits):
$ cd ..
$ git add <only files for this slice>
$ git commit -m "<type(scope): summary>"
$ git push origin cursor/phase1-monorepo-scaffold

# 4. Verify the canonical alias picked up the new commit
#    (60–90s typical):
$ cd frontend
$ npx vercel inspect twin-sooty.vercel.app           # status = Ready
$ curl -sI https://twin-sooty.vercel.app/ | head -8  # 200 + HSTS
$ curl -s  https://twin-sooty.vercel.app/api/public-health | python3 -m json.tool
```

The build log on the new deployment in the `twin` project
should reference the SHA you just pushed.

## What this run observed (evidence — read-only commands)

### `npx vercel whoami`

```
czechowskit
```

### `npx vercel inspect twin-sooty.vercel.app`

```
Fetching deployment "twin-sooty.vercel.app" in twin
> Fetched deployment "twin-pl73bu3t6-twin.vercel.app" in twin [455ms]

  General
    id      dpl_C2XymNokb1nn3vzphE9pS71bEK1F
    name    twin                       ← project
    target  production
    status  ● Ready
    url     https://twin-pl73bu3t6-twin.vercel.app
    created Wed May 27 2026 10:06:11 GMT+0200 [3m ago]

  Aliases
    ╶ https://twin-sooty.vercel.app
    ╶ https://twin-git-cursor-phase1-monorepo-scaffold-twin.vercel.app
```

(The deployment `twin-pl73bu3t6` was the **auto-deploy from
TASK 1's `docs(release)` commit** earlier in this run — first
proof point that the Git → Vercel hook is still wired.)

### `npx vercel project ls` (in `frontend/`)

```
Fetching projects in twin
> Projects found under twin  [2s]

  Project Name   Latest Production URL                Updated   Node Version
  twin           https://twin-twin.vercel.app         10s       24.x   ← canonical (owns twin-sooty alias)
  twin-sooty     https://twin-sooty-twin.vercel.app   22h       24.x   ← what frontend/.vercel/ points to
  frontend       --                                   4d        24.x   ← empty / leftover
```

### `npx vercel ls twin` (canonical project — last 6 deploys)

```
Age     Project       Deployment                                 Status         Environment     Duration
36s     twin/twin     https://twin-bqln9kv94-twin.vercel.app     ● Building     Production      --
3m      twin/twin     https://twin-pl73bu3t6-twin.vercel.app     ● Ready        Production      1m
17h     twin/twin     https://twin-p7cjh4943-twin.vercel.app     ● Ready        Production      1m
17h     twin/twin     https://twin-p6p4skc79-twin.vercel.app     ● Ready        Production      1m
17h     twin/twin     https://twin-8kalaziuz-twin.vercel.app     ● Ready        Production      1m
17h     twin/twin     https://twin-m5alfdhj4-twin.vercel.app     ● Ready        Production      1m
```

The 36s-old "Building" deployment is from the `docs(ci)`
commit shipped earlier in this run — second proof point.

### `npx vercel ls twin-sooty` (the project local link points at)

```
Age     Project             Deployment                                       Status      Environment     Duration
22h     twin/twin-sooty     https://twin-sooty-hnjcs9qej-twin.vercel.app     ● Ready     Production      1m
…
```

`twin-sooty` has had **no new deployment in the last 22h**
even though we pushed 2 commits to the branch today. That
confirms the canonical project is `twin`, not `twin-sooty`,
regardless of what the local link says.

## Drift — local `frontend/.vercel/project.json`

```json
{"projectId":"prj_vN6xFbdufM5rRp86lPVB1rQm2FTp","orgId":"team_kRoghq6m6ogPUxpuwDUongpN","projectName":"twin-sooty"}
```

That `projectId` resolves to the **`twin-sooty`** Vercel
project — **not** the project that owns the canonical alias.
Three things stay true while the drift is live:

1. **Push-based deploy keeps working.** The Vercel Git
   integration is configured on the **`twin`** project, not on
   the local file. Every push to
   `cursor/phase1-monorepo-scaffold` builds and ships through
   `twin`.
2. **`vercel deploy`** (with no overrides) **would deploy to
   the wrong project.** Hence the policy: don't `vercel
   deploy` from this repo. If you must override, pass
   `--scope=twin --project=twin` explicitly (rare, only inside
   a documented maintenance window).
3. **The fix is risk-bearing** — re-linking flips which
   project the CLI talks to, but does not change what users
   see at `twin-sooty.vercel.app`. Re-aliasing flips what
   users see. Both are real-prod operations and require a
   human-monitored window.

### How to fix the drift (when you have a maintenance window)

Two options. **Default: Option A.**

#### Option A — re-link the repo to the canonical `twin` project (recommended)

```
$ cd /Users/tomek/Projects/twin/frontend
$ rm -rf .vercel                                        # disconnect from twin-sooty
$ npx vercel link --scope=twin --project=twin --yes     # connect to twin
$ git add .vercel/project.json
$ git commit -m "chore(vercel): re-link frontend to canonical 'twin' project"
$ git push origin cursor/phase1-monorepo-scaffold
```

- No user-visible change. The alias `twin-sooty.vercel.app`
  keeps serving the same builds as it does today.
- `vercel deploy` from `frontend/` now targets the right
  project.
- After the push, edit `docs/VERCEL_PRODUCTION_BRANCH.md` to
  say `projectName = "twin"`.

#### Option B — re-alias `twin-sooty.vercel.app` onto the `twin-sooty` project

⚠️ **High risk.** This is a prod alias swap — the live
deployment served to candidates changes the moment you flip
it. Pre-conditions:

- The latest `twin-sooty` production deployment is **Ready**
  and **byte-identical** to what's on `twin` today (which it
  is not — `twin-sooty` is 22h stale per the `ls` evidence
  above).
- A human is online watching `curl
  https://twin-sooty.vercel.app/api/public-health` and Vercel
  observability for the next 30 minutes.
- Pre-agreed rollback: re-alias back to the previous `twin`
  deployment.

This option is documented for completeness only — there is no
business reason to pick it in Phase 1.

## Promote / rollback

Phase 1 ships through Git pushes, so the deploy story is also
the rollback story:

```
# Roll back to a previous commit
$ git checkout cursor/phase1-monorepo-scaffold
$ git revert <bad-sha>
$ git push origin cursor/phase1-monorepo-scaffold
# Vercel auto-builds the revert; new prod alias points at it in 60–90s
```

If a rollback must be **instant** (i.e. <30s), use the Vercel
UI to **promote** a previous Ready deployment of the `twin`
project to production. Treat that as a break-glass action —
log it in `docs/DEPLOY_VERIFICATION_CHECKLIST.md` after the
fact.

## When (and only when) to use `vercel deploy` directly

Never in a routine release. The two legitimate scenarios:

1. **GitHub outage** preventing the Git hook from firing.
2. **A hotfix that must skip CI** (extremely rare — and even
   then, prefer `git push` after disabling the CI gate
   manually).

Override pattern (uses CLI scope so the local link drift
doesn't matter):

```
$ cd frontend
$ npx vercel pull   --yes --environment=production --scope=twin --project=twin
$ npx vercel build  --prod
$ npx vercel deploy --prebuilt --prod --scope=twin --project=twin
```

The output prints the alias the new deployment is attached to
(`https://twin-<hash>-twin.vercel.app`). To swap the canonical
alias onto it:

```
$ npx vercel alias set twin-<hash>-twin.vercel.app twin-sooty.vercel.app --scope=twin
```

This is a **prod alias swap**. Pre-conditions same as Option B
above (human online, observability watched).

## Hard bans honoured (this run)

- **No** edit to `frontend/.vercel/project.json` (drift left
  documented).
- **No** `vercel link` / `vercel deploy` / `vercel alias` run
  by the agent.
- **No** alias swap.
- **No** env / secret in this doc.
- **No** project deletion (the empty `frontend` Vercel project
  still exists; intentionally not touched).
- **No** prod env change.

## Files

- This doc (new). **Authoritative** going forward.
- `docs/VERCEL_PROJECT_ALIAS_RUNBOOK_2026-05-26.md` —
  superseded but kept for historical context.
- `docs/VERCEL_PRODUCTION_BRANCH.md` — still says
  `projectName = "twin-sooty"` (older runbook). The fix-up
  edit is part of "Option A" above; do **not** rewrite it
  inside an unattended agent loop.

## Related

- `docs/P1_RELEASE_BASELINE_2026-05-27.md` — confirms canonical
  alias smoke is green at `HEAD=24b44f9` and again at
  `HEAD=6244732` (auto-deploy hook proof point).
- `docs/P1_CI_WORKFLOW_ENABLEMENT_2026-05-27.md` — CI gate
  that protects `cursor/phase1-monorepo-scaffold` pushes once
  the workflow change lands.
- `docs/DEPLOY.md`, `docs/DEPLOY_AUTO.md`,
  `docs/DEPLOY_VERIFICATION_CHECKLIST.md` — operational
  checklists referenced from this runbook.
