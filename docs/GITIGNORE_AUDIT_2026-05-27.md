# `.gitignore` audit — 2026-05-27

**Branch:** `cursor/phase1-monorepo-scaffold`
**Scope:** Backlog 21 of the long autonomous security session.
A docs-only audit of every `.gitignore` in the repo, with the
two questions that matter on a security-engineering session:

1. Is every secret-shaped file ignored?
2. Are there any tracked files that **should** be ignored
   today?

## Files audited

| File                            | Lines | Purpose                                    |
| ------------------------------- | ----- | ------------------------------------------ |
| `.gitignore`                    | 47    | Repo-wide rules (Python, Node, OS, data)   |
| `frontend/.gitignore`           | 42    | Next.js + Vercel-specific overrides         |
| `.venv-strategy/.gitignore`     | small | Strategy venv-specific (out of session scope) |

## Repo-wide `.gitignore` — what it correctly ignores

| Pattern                          | Reason                                                   |
| -------------------------------- | -------------------------------------------------------- |
| `.env`, `.env.local`, `.env.*.local` | Per-environment secrets                                  |
| `.env.railway`                   | Railway-specific secret bundle                            |
| `__pycache__/`, `*.py[cod]`      | Python bytecode (noise)                                   |
| `.venv/`, `venv/`                | Local virtual envs                                         |
| `.pytest_cache/`, `.coverage`    | Test runner state                                          |
| `node_modules/`, `.next/`, `out/`| Node + Next.js build output                                |
| `.idea/`, `.vscode/`, `*.swp`    | Editor state                                               |
| `.DS_Store`, `Thumbs.db`         | OS noise                                                   |
| `backend/.playwright/`, `playwright-report/`, `test-results/` | Test-run output |
| `backend/uploads/`, `backend/data/` | Per-user uploaded data (CVs, audio)                     |
| `backend/celerybeat-schedule*`   | Celery scheduler state                                     |
| `*.log`                          | Local logs                                                 |
| `.cursor/`                       | Cursor IDE state                                            |

## Frontend `frontend/.gitignore` — what it correctly ignores

| Pattern             | Reason                                                       |
| ------------------- | ------------------------------------------------------------ |
| `/node_modules`     | Already covered repo-wide; defence-in-depth                  |
| `.yarn/*` with allowlist | Yarn berry hygiene; ignore most yarn dirs, keep the source-controlled ones |
| `/.next/`, `/out/`, `/build` | Next.js build artefacts                                   |
| `*.pem`             | Certificates — never commit                                  |
| `.env*`             | Frontend env (Next.js public + private)                      |
| `.vercel`           | Frontend `.vercel/project.json` (link state) — see `VERCEL_CANONICAL_DEPLOY_RUNBOOK_2026-05-27.md` for why this is correct |
| `*.tsbuildinfo`     | TypeScript build cache                                        |
| `next-env.d.ts`     | Auto-generated                                                |

## Cross-check: any tracked file that **should** be ignored?

Grepped `git ls-files` for likely-secret-bearing patterns
(`.env`, `secret`, `credential`, `key.json`, `service-account`):

| File                                       | Verdict                                          |
| ------------------------------------------ | ------------------------------------------------ |
| `.env.example`                             | ✅ Template, no secrets                          |
| `.env.production.example`                  | ✅ Template, no secrets                          |
| `.env.railway.example`                     | ✅ Template, no secrets                          |
| `backend/.env.example`                     | ✅ Template, no secrets                          |
| `docs/FOUNDER_SECRETS_WHERE.md`            | ✅ Doc about WHERE secrets live, no values        |
| `scripts/generate-deploy-secrets.sh`       | ✅ Generates random values; references no actual secret |
| `scripts/railway-apply-github-oauth-secret.sh` | ✅ Operator script; reads from env, never embeds  |

Also grepped for extensions `(env|key|pem|p12|pfx|crt)`:
**0 matches** outside the `.example` templates.

## Cross-check: any ignored file present in the working tree?

`git status --ignored` returns:

```
.DS_Store
.env
.env.railway
.pytest_cache/
.venv-strategy/
.venv/
__pycache__/
backend/.env
backend/.pytest_cache/
backend/.venv/
backend/alembic/__pycache__/
backend/app/__pycache__/  (and friends)
backend/app/services/career_discovery/  (per-developer scratch dir)
```

All match `.gitignore` rules. ✅ No surprise file is silently
tracked or silently untracked.

## Tracked files larger than 200 KB

`git ls-files | xargs wc -c | sort -rn | head -15`:

| Size (B)    | File                                                          |
| ----------- | ------------------------------------------------------------- |
| 2,212,749   | `docs/investor-audit-screenshots/02-demo-ranked-roles.png`    |
| 2,189,378   | `docs/investor-audit-screenshots/01-demo-live-preview.png`    |
| 795,194     | `complete-audit.txt`                                          |
| 569,208     | `backend/assets/fonts/NotoSans-Regular.ttf`                   |
| 319,059     | `frontend/src/lib/i18n.ts`                                    |
| 237,271     | `frontend/package-lock.json`                                  |
| 217,213     | `final-audit.txt`                                             |

### Observations

- The two investor screenshots (>2 MB each) are legitimate; they
  belong to the investor data-room narrative and aren't private.
- `complete-audit.txt` and `final-audit.txt` are session output
  dumps; arguably noise but **not** secrets. Consider moving
  them under `docs/audits/` or `.gitignore`-ing them.
- `backend/assets/fonts/NotoSans-Regular.ttf` is intentional
  (PDF generation needs a real font file). Acceptable.
- `frontend/src/lib/i18n.ts` is the locale catalog — 319 KB is
  large but expected for an i18n source file with ~hundreds of
  message keys.

None of the large files contain secrets (spot-checked).

## Suggested next-actions (out of scope this session)

| Risk           | Action                                                        | Cost |
| -------------- | ------------------------------------------------------------- | ---- |
| L              | Add `*-audit.txt` to `.gitignore` if those dumps shouldn't be tracked | 1 LOC |
| L              | Add `docs/audits/` convention if the dumps **should** stay   | move 2 files |
| L              | Consider `lfs` for the two 2 MB investor screenshots if more arrive | medium |

None of these are urgent; the repo's secret hygiene is intact.

## Hard bans honoured

- ✅ Docs only.
- ✅ No `.gitignore` change in this commit.
- ✅ No tracked-file delete.
- ✅ No secret in this audit (file names referenced, values
  never).
- ✅ No deploy / Railway / Vercel change.
- ✅ No UX / copy change.

## Files

- `docs/GITIGNORE_AUDIT_2026-05-27.md` (this doc).

## Related

- `.gitignore` — repo-wide rules.
- `frontend/.gitignore` — frontend rules.
- `docs/FOUNDER_SECRETS_WHERE.md` — where actual secret values
  live (1Password / Railway env / Vercel env).
- `docs/SECURITY_RISK_REGISTER_2026-05-27.md` — R-021, R-022
  on token rotation.

Backlog 21 of the long autonomous security session.
