# Public Health Commit Interpretation — 2026-06-19

**Branch:** `ops/prod-persistence-auth-smoke-and-health-clarity-2026-06-19`  
**Endpoint:** `GET /api/public-health` (Vercel proxy → Railway `/api/v1/health`)

## Purpose

Clarify how deploy commit fields in public-health should be read in ops reports. Frontend and backend deploy on different platforms and can diverge legitimately.

## Fields (additive, non-breaking)

| Field | Source | Meaning |
|-------|--------|---------|
| `git_commit` | Railway API env | **Legacy compat** — same as API/Railway deploy SHA |
| `api_commit` | Railway API env | Railway backend deploy SHA |
| `backend_git_commit` | Railway API env | Explicit alias of `api_commit` |
| `frontend_commit` | Vercel env on Next route | Vercel frontend deploy SHA |
| `deployment_note` | Static helper text | Explains platform split |
| `commit_interpretation` | Computed short-SHA compare | Human-readable alignment hint |
| `db_ok` | Railway `SELECT 1` | Database reachable — **not** Alembic revision |

## Three SHAs in reports

1. **Scaffold HEAD** — `git log -1` on `origin/cursor/phase1-monorepo-scaffold` in repo/PR reports.
2. **Vercel frontend commit** — `frontend_commit` from public-health (or Vercel deploy dashboard).
3. **Railway backend commit** — `api_commit` / `git_commit` / `backend_git_commit`.

## Why they can differ

| Scenario | Expected pattern |
|----------|------------------|
| Full-stack PR merged + both redeployed | Short SHAs match |
| Frontend-only PR (#152–#165 style) | `frontend_commit` newer than `api_commit` |
| Backend-only PR (migrations/API) | `api_commit` newer than `frontend_commit` |
| Partial deploy queue | Either SHA may lag scaffold HEAD |

**Important:** A newer Vercel frontend does **not** prove Railway ran migrations. Alembic verification is a **separate** check — see `docs/ALEMBIC_PROD_HEAD_VERIFICATION_2026-06-19.md`.

## “Aligned enough”

For a given verification slice:

- **Frontend slice:** `frontend_commit` matches the merged PR SHA (or expected Vercel deploy).
- **Backend slice:** `api_commit` matches the merged PR SHA **and** Alembic `current` = expected head.
- **Full persistence batch:** both SHAs match scaffold HEAD **and** `db_ok: true` **and** migration head confirmed.

Mismatch on short SHA alone is **not** automatically a deploy failure — check which platform the PR touched.

## Verification command

```bash
curl -sS https://twin-sooty.vercel.app/api/public-health | jq '{
  status, db_ok,
  git_commit, frontend_commit, api_commit, backend_git_commit,
  commit_interpretation, deployment_note
}'
```

## Safety

- No secrets in response.
- No Alembic revision exposed on public route (use admin endpoint or Railway shell).
- Existing consumers of `git_commit` unchanged.

## Launch stance (unchanged)

| Gate | Status |
|------|--------|
| Public launch | **NO-GO** |
| P0 performance | **OPEN** |
| Phase 3B | **HARD BLOCKED** |
