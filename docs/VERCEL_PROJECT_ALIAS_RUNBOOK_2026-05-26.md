# Vercel Project ↔ Alias Runbook — 2026-05-26

TASK 6 of the overnight engineering run. Documents the
**canonical mapping** between the public alias
`https://twin-sooty.vercel.app`, the Vercel **project** that
actually owns it, and the local `.vercel/project.json` linkage
inside this repo. Captures the drift between
`frontend/.vercel/project.json` (locally linked to a different
project) and the live alias, so future overnight agents (and
humans on call) do not accidentally redeploy to the wrong
project or chase a phantom deploy.

## TL;DR

- **Canonical public alias:** `https://twin-sooty.vercel.app`.
- **Vercel project that owns the alias:** `twin` (org-root
  project, root directory `frontend`, production branch
  `cursor/phase1-monorepo-scaffold`).
- **Local linkage in this repo:**
  `frontend/.vercel/project.json` points at the
  **`twin-sooty`** project (`projectId
  prj_vN6xFbdufM5rRp86lPVB1rQm2FTp`). This is **drift**, not a
  pointer to the live alias.
- **Effect:** every overnight push to
  `cursor/phase1-monorepo-scaffold` is automatically built and
  deployed by the `twin` project's Git integration, **not** by
  the `twin-sooty` project. Running `vercel deploy` from
  `frontend/` would deploy to `twin-sooty` (the "wrong" project)
  unless `--name twin` is passed or the link is updated.
- **Action this run:** documented only. The link is **not**
  fixed in this commit because the previous PR
  (`docs/VERCEL_PRODUCTION_BRANCH.md`) explicitly states the
  intended project is `twin-sooty`; flipping the link unilaterally
  risks invalidating prior runbooks. The fix path is recorded
  here for the next maintenance window.

## Evidence (commands run during this task)

```
$ npx vercel inspect twin-sooty.vercel.app
Fetching deployment "twin-sooty.vercel.app" in twin
> Fetched deployment "twin-21vzhwf9b-twin.vercel.app" in twin [438ms]

  General
    id     dpl_BLdUoeQDxsDiPCjMMs9VQLpnuHf9
    name   twin                                                    ← project
    target production
    status ● Ready
    url    https://twin-21vzhwf9b-twin.vercel.app

  Aliases
    ╶ https://twin-sooty.vercel.app                                ← canonical
    ╶ https://twin-git-cursor-phase1-monorepo-scaffold-twin.vercel.app
```

Build log confirms the source SHA:

```
2026-05-26T14:21:53.901Z  Cloning github.com/CzechowskiT/twin
  (Branch: cursor/phase1-monorepo-scaffold, Commit: 8b53e1d)
```

`vercel project ls` (run in `frontend/`):

```
Fetching projects in twin
> Projects found under twin  [2s]

  Project Name   Latest Production URL                 Updated   Node Version
  twin           https://twin-sooty.vercel.app         40s       24.x      ← owns canonical alias
  twin-sooty     https://twin-sooty-twin.vercel.app    4h        24.x      ← what frontend/.vercel/ points to
  frontend       --                                    3d        24.x      ← empty / stale
```

`frontend/.vercel/project.json`:

```json
{"projectId":"prj_vN6xFbdufM5rRp86lPVB1rQm2FTp","orgId":"team_kRoghq6m6ogPUxpuwDUongpN","projectName":"twin-sooty"}
```

That `projectId` resolves to the **`twin-sooty`** project — the
one whose production URL is `twin-sooty-twin.vercel.app`, not
the canonical alias.

## Why this drift is OK *for now* (no action needed in this run)

- **The Git integration on `twin` works.** Pushing to
  `cursor/phase1-monorepo-scaffold` triggered the `twin`
  project's auto-deploy hook within ~8 seconds of the push hit
  GitHub (commit `8b53e1d` → build started at
  `2026-05-26T14:21:53.901Z`).
- **No overnight task in this run requires `vercel deploy`
  from `frontend/`.** Every change shipped this overnight is
  client-only TypeScript / docs / spec, all auto-deployed by
  the `twin` project's Git hook.
- **Touching `frontend/.vercel/project.json` would invalidate
  the existing `docs/VERCEL_PRODUCTION_BRANCH.md` runbook**
  (which says the project is `twin-sooty`). Re-linking without
  re-writing that runbook + verifying the second project's
  env / domains / production branch is **not** safe to do
  unilaterally inside an overnight agent loop.

## When to fix it

Fix during a **scheduled maintenance window** when a human is
available to:

1. Decide which project is canonical for new deploys.
   - **Option A (recommended):** keep `twin` as canonical
     (it's where the alias already lives, where Vercel's UI
     shows real production deploys, and where Git auto-deploy
     is wired). Update
     `frontend/.vercel/project.json` to point at `twin`'s
     `projectId` (whatever value `vercel project inspect twin`
     reports). Update
     `docs/VERCEL_PRODUCTION_BRANCH.md` to say project=`twin`.
   - **Option B:** keep `twin-sooty` as canonical. Re-alias
     `twin-sooty.vercel.app` to a `twin-sooty` deployment
     (this is a **prod alias swap** — high-risk because the
     live deployment served to candidates changes). Then run
     `vercel link --project twin-sooty` from `frontend/`. **Do
     not** pick this option without a human owner online.
2. Decide what to do with the empty `frontend` project (the
   third entry in `vercel project ls`). It has no production
   URL; it's likely a leftover from an earlier scaffold
   attempt. Safe to delete after archiving any settings.

## Day-to-day workflow (unchanged by this drift)

```
# 1. Make changes locally.
$ cd frontend
$ npm run lint && npx tsc --noEmit && npm run build  # local gates

# 2. Commit & push. The Vercel "twin" project's Git
#    integration auto-deploys from
#    cursor/phase1-monorepo-scaffold.
$ git push origin cursor/phase1-monorepo-scaffold

# 3. Verify the canonical alias picked up the new commit.
$ npx vercel inspect twin-sooty.vercel.app    # see commit SHA + Ready
$ curl -sI https://twin-sooty.vercel.app/     # 200 + security headers
$ curl -s  https://twin-sooty.vercel.app/api/public-health | python3 -m json.tool
```

`vercel deploy` from `frontend/` is **not part of the
day-to-day workflow** while the linkage points at the wrong
project. The Git integration on `twin` already handles every
push. If you must manually deploy, override the project
explicitly:

```
$ cd frontend
$ npx vercel pull --yes --environment=production --scope=twin --project=twin
$ npx vercel deploy --prebuilt --prod --scope=twin --project=twin
```

(The `--project=twin` override survives even when
`frontend/.vercel/project.json` is wrong.)

## Hard bans honoured

- **No** edit to `frontend/.vercel/project.json` in this run.
- **No** re-link of the local project via `vercel link`.
- **No** alias swap (would change what end-users see at
  `twin-sooty.vercel.app`).
- **No** deletion of any of the three projects (`twin`,
  `twin-sooty`, `frontend`).
- **No** prod env / secret change.
- **No** `.env` / token / JWT contents in this doc.

## Smoke for the canonical alias (this run)

```
$ for p in / /dashboard /login /register /waitlist /api/public-health; do
    code=$(curl -s -o /dev/null -w "%{http_code}" -L "https://twin-sooty.vercel.app${p}")
    echo "${p}: ${code}"
  done

/: 200
/dashboard: 200
/login: 200
/register: 200
/waitlist: 200
/api/public-health: 200
```

```
$ curl -sI https://twin-sooty.vercel.app/ | head -10
HTTP/2 200
strict-transport-security: max-age=63072000; includeSubDomains; preload
x-frame-options: DENY
x-content-type-options: nosniff
referrer-policy: strict-origin-when-cross-origin
permissions-policy: camera=(), microphone=(), geolocation=(), interest-cohort=()
content-security-policy-report-only: default-src 'self'; ...
```

Strong header set on the canonical alias. CSP is `report-only`
by intent (see `docs/P1_SECURITY_NEXT_STEPS_2026-05-26.md`).

## Related

- `docs/VERCEL_PRODUCTION_BRANCH.md` — older runbook (claims
  project=`twin-sooty`; needs reconciliation during the next
  maintenance window).
- `docs/OVERNIGHT_RELEASE_VERIFY_564F032_2026-05-26.md` — first
  reference to this drift, captured during TASK 0.
- `docs/OVERNIGHT_RELEASE_VERIFY_JOB_APPLICATION_ACTIONS_2026-05-26.md`
  — TASK 2 verify pass on top of this same alias.
