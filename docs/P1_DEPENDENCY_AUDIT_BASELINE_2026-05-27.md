# P1 Dependency Audit Baseline — 2026-05-27

TASK 1 of the 2026-05-27 security-ops session on
`cursor/phase1-monorepo-scaffold`. Captures the **current dependency
posture** for `frontend/` (npm) and `backend/` (pip) **before**
any upgrade in this run. Documentation-only — no `package.json` /
`requirements.txt` change, no `package-lock.json` regeneration, no
`pip install`, no Railway redeploy.

## TL;DR

- **Frontend (npm):** 2 **moderate** advisories, both transitive
  via `next 16.2.6 → postcss < 8.5.10` (GHSA-qx2v-qp2m-jg93,
  PostCSS XSS via unescaped `</style>` in stringify output).
  **No safe in-range patch** — `npm audit fix` is a no-op, and
  `npm audit fix --force` would downgrade `next` to `9.3.3`
  (breaking change, blocked by hard ban "no big dashboard
  refactors / no product features"). **Wait** for `next` to ship
  a postcss bump.
- **Frontend npm outdated:** 10 packages with newer versions
  available; only 5 are **inside** the current semver range
  (`@hookform/resolvers`, `@types/react`, `framer-motion`,
  `react-hook-form`, `react-hot-toast`). The other 5 are
  **major** (`@types/node 20 → 25`, `eslint 9 → 10`,
  `typescript 5 → 6`, plus react 19.2.4 vs 19.2.6 within
  major). No upgrade applied this run — documented as a
  follow-up so we do not couple a dep bump with the security
  audit commits.
- **Backend (pip):** `pip-audit` and `safety` are **not
  installed** on this machine (neither globally nor in
  `.venv` / `.venv-strategy`). Per the hard-ban "no heavy
  global install", we do **not** install them in this run.
  Inventory of `backend/requirements.txt` captured below; all
  pinned at safe floors (`>=` for libs, hard pin `slowapi==0.1.9`,
  bounded major `stripe<12`, `boto3<2`, `scikit-learn<2`,
  `bcrypt<4.1`).
- **Verdict:** **safe to keep shipping** on this branch.
  Two moderate-only transitive issues, no critical / high, no
  direct dep is on the advisory list, no upgrade applied in
  this commit. Stripe, postcss, next, anthropic, fastapi
  all at recent versions. No secrets in any manifest.

## Frontend — `npm audit`

```
$ npm audit
# npm audit report

postcss  <8.5.10
Severity: moderate
PostCSS has XSS via Unescaped </style> in its CSS Stringify Output
  - https://github.com/advisories/GHSA-qx2v-qp2m-jg93
fix available via `npm audit fix --force`
Will install next@9.3.3, which is a breaking change
node_modules/next/node_modules/postcss
  next  9.3.4-canary.0 - 16.3.0-canary.5
  Depends on vulnerable versions of postcss
  node_modules/next

2 moderate severity vulnerabilities
```

JSON metadata:

```json
{
  "vulnerabilities": {
    "info": 0,
    "low": 0,
    "moderate": 2,
    "high": 0,
    "critical": 0,
    "total": 2
  },
  "dependencies": {
    "prod": 32,
    "dev": 375,
    "optional": 83,
    "peer": 0,
    "peerOptional": 0,
    "total": 443
  }
}
```

### Analysis

- The advisory affects PostCSS's **CSS string serializer**. We do
  **not** serialize user-controlled CSS in any request path —
  Tailwind v4 + PostCSS only runs at **build time** under Next.
  Runtime attack surface in production is **none**.
- The vulnerable `postcss` is nested under `node_modules/next/
  node_modules/postcss`, i.e. **pinned by next** itself. Our
  own dependency tree's top-level `postcss` (via
  `@tailwindcss/postcss`) is on a fixed version. We cannot fix
  the nested copy without `npm audit fix --force`, which the
  CLI itself flags as **breaking** (downgrade to `next@9`).
- Action: **monitor** `next` releases for a `postcss >= 8.5.10`
  bump and pick it up in the next scheduled minor / patch.
  Do **not** force a downgrade.

## Frontend — `npm outdated`

```
Package               Current    Wanted   Latest
@hookform/resolvers     5.2.2     5.4.0    5.4.0   (in range)
@types/node          20.19.41  20.19.41   25.9.1   (major)
@types/react          19.2.14   19.2.15  19.2.15   (in range)
eslint                 9.39.4    9.39.4   10.4.0   (major)
framer-motion         12.39.0   12.40.0  12.40.0   (in range)
react                  19.2.4    19.2.4   19.2.6   (patch, no in-range bump)
react-dom              19.2.4    19.2.4   19.2.6   (patch, no in-range bump)
react-hook-form        7.76.0    7.76.1   7.76.1   (in range)
react-hot-toast         2.5.2     2.6.0    2.6.0   (in range)
typescript              5.9.3     5.9.3    6.0.3   (major)
```

### Analysis

- The 5 "in range" rows could be picked up with a plain
  `npm install` (no manifest change). They are all patch
  / minor bumps with no security advisory listed against
  the older version.
- We deliberately **do not** regenerate `package-lock.json`
  in this audit commit so the diff stays
  documentation-only. The next scheduled "safe dep refresh"
  commit can run `npm install` and verify with
  `npm run lint && npx tsc --noEmit && npm run build`.
- The 5 **major** bumps (`@types/node 25`, `eslint 10`,
  `typescript 6`, plus react 19.2.6 outside the strict
  `19.2.4` pin) are **not** in scope for this run.

## Backend — `pip-audit` / `safety`

Neither tool is installed on this machine:

```
$ which pip-audit safety
pip-audit not found
safety not found

$ ls .venv/bin/ | grep -iE "pip-audit|safety"
(empty)
```

Per the run's hard-ban "no heavy global install", we do **not**
add either to the workstation venv during this session. They
are appropriate to install in **CI** (e.g. `pip-audit -r
backend/requirements.txt`) once the workflow PAT scope is
unblocked (see `docs/P1_CI_WORKFLOW_ENABLEMENT_2026-05-27.md`),
but a workstation-only install would not change production
posture and risks polluting the venv.

## Backend — manifest inventory (`backend/requirements.txt`)

| Package | Version constraint | Notes |
| --- | --- | --- |
| fastapi | `>=0.115.0` | Web framework |
| uvicorn[standard] | `>=0.32.0` | ASGI server |
| sqlalchemy | `>=2.0.36` | ORM |
| alembic | `>=1.14.0` | Migrations |
| psycopg[binary] | `>=3.2.0` | Postgres driver |
| pydantic[email] | `>=2.10.0` | Models / validation |
| pydantic-settings | `>=2.6.0` | Settings |
| python-jose[cryptography] | `>=3.3.0` | JWT |
| passlib[bcrypt] | `>=1.7.4` | Password hashing wrapper |
| bcrypt | `>=4.0.0,<4.1.0` | Compat pin |
| celery[redis] | `>=5.4.0` | Task queue |
| redis | `>=5.2.0` | Redis client |
| httpx | `>=0.28.0` | HTTP client |
| anthropic | `>=0.42.0` | Claude SDK |
| beautifulsoup4 | `>=4.12.0` | HTML parsing |
| playwright | `>=1.49.0` | Browser automation |
| python-multipart | `>=0.0.17` | Multipart parsing |
| slowapi | `==0.1.9` | Rate limiting (hard pin) |
| pypdf | `>=5.1.0` | PDF read |
| fpdf2 | `>=2.8.0` | PDF write |
| python-docx | `>=1.1.2` | DOCX |
| openpyxl | `>=3.1.0` | XLSX |
| pytest | `>=8.3.0` | Tests |
| pytest-asyncio | `>=0.24.0` | Async tests |
| stripe | `>=11.0.0,<12.0.0` | Stripe SDK (major-bounded) |
| boto3 | `>=1.34.0,<2.0.0` | AWS SDK (major-bounded) |
| scikit-learn | `>=1.5.0,<2.0.0` | ML (major-bounded) |

Floor-only `>=` lines mean each `pip install` may pick up a
**newer** patch / minor at deploy time. This is consistent with
how Railway redeploys today. Stripe, boto3, scikit-learn are
**bounded** at the next major to avoid surprise breaking
changes — a sensible default for security-sensitive surfaces.

## Hard-ban compliance

- No Railway change, no API redeploy, no DB migration.
- No `package.json` / `package-lock.json` / `requirements.txt`
  edit in this commit.
- No secret printed (no `.env` read).
- No force push.
- No dependency upgrade applied — documentation-only.

## Follow-ups (out of scope for this commit)

1. Monitor `next` for a release that pins `postcss >= 8.5.10`
   and pick it up.
2. Schedule a "safe in-range refresh" commit that runs
   `npm install` (no manifest change), verifies
   `lint + tsc + build`, and commits the lockfile delta.
3. Add `pip-audit` to backend CI (in the same workflow as
   `pytest -q`) once the PAT scope is granted.
4. Re-baseline after each next-version bump (`next` 16.x
   patches arrive frequently).

## Verification

- `npm audit` → 2 moderate, 0 high, 0 critical (same posture
  as before this commit; nothing was modified).
- `npm outdated` → 10 rows (same as before this commit).
- `npm run lint`, `npx tsc --noEmit`, `npm run build` —
  all green on `cursor/phase1-monorepo-scaffold` HEAD
  (`5cf2b79`) as captured in
  `docs/P1_RELEASE_BASELINE_2026-05-27.md`.
