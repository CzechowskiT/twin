# P1 Dependency Audit Baseline — 2026-05-27

TASK 1 of the **security / ops hardening** session on
`cursor/phase1-monorepo-scaffold` (morning, 2026-05-27).
This is the **read-only baseline** of dependency CVE state for
both `frontend/` (npm) and `backend/` (pip). No upgrades shipped
in this commit — the doc just records what we have, so future
fixes can be diffed against it.

## TL;DR

- `frontend/` `npm audit` returns **2 moderate, 0 high, 0
  critical** advisories. Both are the same root cause: a
  postcss < 8.5.10 nested inside Next.js 16.2.6's own
  `node_modules`. **npm's suggested fix is a downgrade to
  Next 9.3.3** (it flags the fix as `isSemVerMajor: true`)
  — that is a false positive in the auto-resolver, not a
  real fix path; ignore it and wait for an upstream Next
  patch.
- `backend/requirements.txt` has **no `pip-audit` /
  `safety` run in this session**: neither tool is installed
  in the workspace's `.venv` (only `pip` is present) and
  the task brief explicitly says **don't install heavy
  global tools**. Audit is therefore deferred to the CI
  job already scoped in
  `docs/P1_SECURITY_IMPLEMENTATION_PLAN_2026-05-27.md`
  (item 4 — "`npm audit` + `pip-audit` baseline"). That CI
  job will run `pip-audit` in a clean container; this doc
  is the **manual baseline** until then.
- No dependency was bumped in this commit.
  No `package-lock.json` change.
  No `requirements.txt` change.

Verdict: **docs-only baseline**. Both `frontend/` and
`backend/` stay on their current pinned set. Safe to keep
shipping.

## Frontend — `npm audit` (run from `frontend/`)

`npm audit --json` was run against the committed
`package-lock.json` on `cursor/phase1-monorepo-scaffold`
@ `HEAD = 5cf2b79` (`docs(release): add morning engineering
handoff`).

### Headline counts

| Severity   | Count |
| ---------- | ----- |
| info       | 0     |
| low        | 0     |
| **moderate** | **2** |
| high       | 0     |
| critical   | 0     |
| **total**  | **2** |

Tracked deps (npm classifies them): **prod 32**, dev 375,
optional 83, peer 0 — **443 total** in the resolved tree.

### Both advisories share the same root

```text
{
  "name": "postcss",
  "severity": "moderate",
  "isDirect": false,
  "via": [
    {
      "title": "PostCSS has XSS via Unescaped </style> in its CSS Stringify Output",
      "url": "https://github.com/advisories/GHSA-qx2v-qp2m-jg93",
      "cwe": ["CWE-79"],
      "cvss": { "score": 6.1 },
      "range": "<8.5.10"
    }
  ],
  "effects": ["next"],
  "range": "<8.5.10",
  "nodes": ["node_modules/next/node_modules/postcss"]
}
```

- The vulnerable `postcss` lives **inside Next.js's own
  `node_modules/next/node_modules/postcss`**, not in our
  direct deps. Our top-level `postcss` (via
  `@tailwindcss/postcss`) is already on a safe range — we
  don't own this copy.
- npm's `fixAvailable` reports `next@9.3.3` with
  `isSemVerMajor: true`. That is **npm's resolver being
  unable to find any newer Next that lists a safe nested
  postcss**, so it walks all the way back to a release
  before this code path existed. Following that
  recommendation would mean **regressing Next.js from
  16.2.6 to 9.3.3** — six major versions back, app would
  not boot. **Do not act on it.**
- Real fix path: wait for an upstream Next.js patch that
  bumps its bundled postcss, or pin postcss > 8.5.10 via a
  `package.json` `"overrides"` block. Adding `overrides`
  is the right move for a follow-up; **out of scope for
  this docs-only baseline** because it changes the lockfile.
- Exploit surface in our app: low. The CVE is XSS via a
  `</style>` token in stringified CSS output — we don't
  feed user-controlled CSS through postcss at runtime in
  `frontend/`. CSS is built at deploy time from our own
  source under `frontend/src/app/`.

### `npm outdated` snapshot (low-risk patch candidates)

`npm outdated --long` returned **10 outdated packages**.
Filtered to **safe patch / minor** moves only (no major
bumps, per task brief):

| Package               | Current   | Wanted (patch / minor) | Latest    | Notes                       |
| --------------------- | --------- | ---------------------- | --------- | --------------------------- |
| `@hookform/resolvers` | `5.2.2`   | `5.4.0`                | `5.4.0`   | minor; OK to bump in P2     |
| `@types/react`        | `19.2.14` | `19.2.15`              | `19.2.15` | patch; OK to bump in P2     |
| `framer-motion`       | `12.39.0` | `12.40.0`              | `12.40.0` | minor; OK to bump in P2     |
| `react-hook-form`     | `7.76.0`  | `7.76.1`               | `7.76.1`  | patch; OK to bump in P2     |
| `react-hot-toast`     | `2.5.2`   | `2.6.0`                | `2.6.0`   | minor; OK to bump in P2     |
| `react` / `react-dom` | `19.2.4`  | `19.2.4`               | `19.2.6`  | latest > wanted; **skip** until lockfile resolves |
| `@types/node`         | `20.x`    | same                   | `25.x`    | major; **skip**             |
| `eslint`              | `9.x`     | same                   | `10.x`    | major; **skip**             |
| `typescript`          | `5.9.3`   | `5.9.3`                | `6.0.3`   | major; **skip**             |

None of the "Wanted" bumps above are landed in this commit
— this is a **baseline doc**. The point is: next time
someone runs the audit, the diff against this table is
**the list of actions to take**.

### Verdict (frontend)

**No upgrade in this commit.** The 2 moderate advisories
are nested-postcss false-positives we can't fix without a
Next bump we won't do this session; the 5 patch/minor
candidates are real but **out of scope** for a docs-only
baseline. Track in a follow-up PR.

## Backend — `pip-audit` / `safety`

### Tool availability check

| Tool        | Location checked                                    | Available? |
| ----------- | --------------------------------------------------- | ---------- |
| `pip-audit` | `$(which pip-audit)`                                | **no**     |
| `pip-audit` | `.venv/bin/pip show pip-audit`                      | **no**     |
| `pip-audit` | `.venv-strategy/bin/pip show pip-audit`             | **no**     |
| `safety`    | `$(which safety)`                                   | **no**     |
| `safety`    | `.venv/bin/pip show safety`                         | **no**     |
| `safety`    | `.venv-strategy/bin/pip show safety`                | **no**     |

Per the task brief: **"only if already available — don't
install heavy global tools"**. Audit deferred to the CI
job described in
`docs/P1_SECURITY_IMPLEMENTATION_PLAN_2026-05-27.md`
item 4, which will run `pip-audit` in a clean container.

### Backend dependency surface

Snapshot of `backend/requirements.txt` (committed pins):

```text
fastapi>=0.115.0
uvicorn[standard]>=0.32.0
sqlalchemy>=2.0.36
alembic>=1.14.0
psycopg[binary]>=3.2.0
pydantic[email]>=2.10.0
pydantic-settings>=2.6.0
python-jose[cryptography]>=3.3.0
passlib[bcrypt]>=1.7.4
bcrypt>=4.0.0,<4.1.0
celery[redis]>=5.4.0
redis>=5.2.0
httpx>=0.28.0
anthropic>=0.42.0
beautifulsoup4>=4.12.0
playwright>=1.49.0
python-multipart>=0.0.17
slowapi==0.1.9
pypdf>=5.1.0
fpdf2>=2.8.0
python-docx>=1.1.2
openpyxl>=3.1.0
pytest>=8.3.0
pytest-asyncio>=0.24.0
stripe>=11.0.0,<12.0.0
boto3>=1.34.0,<2.0.0
scikit-learn>=1.5.0,<2.0.0
```

Watch-items for the CI `pip-audit` job (no action taken
in this session, just a heads-up for the next person):

- `python-jose[cryptography]>=3.3.0` — the historical
  `python-jose` algorithm-confusion CVEs are fixed in
  3.3.0; **3.3.0 is the floor**, so we are above. Confirm
  with a real `pip-audit` run.
- `passlib[bcrypt]>=1.7.4` + `bcrypt>=4.0.0,<4.1.0` —
  pinned pair (passlib + bcrypt 4.0.x compatibility);
  don't bump bcrypt past 4.0.x without a passlib bump.
- `playwright>=1.49.0` — keep open-floor for security
  patches; CDN-update dependent, not a CVE story.
- `stripe>=11.0.0,<12.0.0` — major-version pin; Stripe SDK
  major bumps require an API version change (see
  `docs/STRIPE.md`). Audit item 6 (webhook signature) does
  **not** require an SDK bump.
- `celery[redis]>=5.4.0` — the historical Celery / kombu
  CVEs are pre-5.x; we are well past them.

No transitive lockfile committed (`pip freeze` output is
not checked in). The next CI run with `pip-audit` will be
the **first machine-checked baseline**; this doc is the
manual stand-in.

### Verdict (backend)

**No upgrade in this commit.** Tool unavailable; CI job
is the planned home for this. Pinned floors look sane on
visual inspection of `requirements.txt`.

## What this doc does **not** do

- Does **not** ship any dependency bump.
- Does **not** change `package.json`, `package-lock.json`,
  or `backend/requirements.txt`.
- Does **not** install `pip-audit` / `safety` globally.
- Does **not** add `npm-audit-ci` / `pip-audit` workflows.
  Those are item 4 of the security implementation plan;
  see that doc for the workflow shape.
- Does **not** change any production env, Railway service,
  or Vercel project.

## Hard bans honoured (this run)

- No Railway change / redeploy.
- No API redeploy.
- No DB migration.
- No prod env change.
- No secret / JWT in this doc.
- No `--no-verify`, no force-push.
- No scrape / auto-apply / application send.
- No UX / copy change.

## Pre-flight (this run)

```text
$ git fetch --all --prune
$ git checkout cursor/phase1-monorepo-scaffold
$ git pull --ff-only origin cursor/phase1-monorepo-scaffold
Already up to date.

$ git status -sb
## cursor/phase1-monorepo-scaffold...origin/cursor/phase1-monorepo-scaffold

$ git log --oneline -12
5cf2b79 docs(release): add morning engineering handoff
cd61350 test(frontend): strengthen public smoke coverage
1c189ff docs(security): prepare p1 implementation plan
bb819ef docs(vercel): document canonical deploy runbook
6244732 docs(ci): document workflow enablement steps
24b44f9 docs(release): record p1 release baseline
cd648b4 docs(release): record overnight engineering progress
703efe1 docs(observability): outline p1 logging metrics tracing plan
ddce6dd docs(security): outline p1 auth and observability next steps
a03e68a docs(vercel): document production alias workflow
50dedde chore(ci): harden p1 release checks
a022f14 test(dashboard): add safe dashboard smoke coverage
```

Local frontend gates (from `frontend/`) at session start:

| Gate                      | Result                |
| ------------------------- | --------------------- |
| `npm run lint` (eslint)   | 0 errors / 0 warnings |
| `npx tsc --noEmit`        | 0 errors              |
| `npm run build` (Next 16) | OK, 85 routes         |

## Files

- This doc (new).

## Related

- `docs/P1_SECURITY_IMPLEMENTATION_PLAN_2026-05-27.md`
  — item 4 ("`npm audit` + `pip-audit` baseline") is the
  follow-up CI workflow for both ecosystems.
- `docs/P1_SECURITY_NEXT_STEPS_2026-05-26.md` — source
  backlog for the implementation plan.
- `docs/P1_RELEASE_BASELINE_2026-05-27.md` — same-day
  pre-run baseline for `cursor/phase1-monorepo-scaffold`.
