# Alembic Workstream Migration Plan — 2026-06-11

**Purpose:** Define a linear, conflict-free Alembic revision chain before any backend multi-persona MVP PR merges.

**Scaffold branch:** `cursor/phase1-monorepo-scaffold` @ `5da3223` (2026-06-11).

---

## Current scaffold migration head

| Field | Value |
|---|---|
| **Head revision** | `055_recruiter_manual_scheduling` |
| **File** | `backend/alembic/versions/055_recruiter_manual_scheduling.py` |
| **Parent (`down_revision`)** | `054_recruiter_pipeline_status` |

Verify locally:

```bash
cd backend && alembic heads   # expect single head: 055_recruiter_manual_scheduling
pytest tests/test_alembic_single_head.py -q
```

---

## Resolved linear chain (050 → 055)

Production was at `050_stripe_webhook_events`. Parallel WIP migrations both claimed `051` (`051_company_role_fields` and `051_recruiter_audit_events`), which blocked Railway `alembic upgrade head`. **Fixed in PR #97** — one linear chain, no merge revision.

| Order | Revision ID | File | `down_revision` |
|---|---|---|---|
| — | `050_stripe_webhook_events` | `050_stripe_webhook_events.py` | `049_job_match_feedback` |
| 1 | `051_company_role_fields` | `051_company_role_fields.py` | `050_stripe_webhook_events` |
| 2 | `052_calendar_access_token_cache` | `052_calendar_access_token_cache.py` | `051_company_role_fields` |
| 3 | `053_recruiter_audit_events` | `053_recruiter_audit_events.py` | `052_calendar_access_token_cache` |
| 4 | `054_recruiter_pipeline_status` | `054_recruiter_pipeline_status.py` | `053_recruiter_audit_events` |
| 5 | `055_recruiter_manual_scheduling` | `055_recruiter_manual_scheduling.py` | `054_recruiter_pipeline_status` |

**Guard:** `backend/tests/test_alembic_single_head.py` (PR #99) — CI fails if multiple heads reappear.

---

## WIP conflict summary (historical — do not reintroduce)

The archived dirty tree (`wip/multi-persona-mvp-local-snapshot-2026-06-11` @ `1c35bce`) and `stash@{45}` contained **parallel unmerged revisions**:

| WIP file | Problem |
|---|---|
| `051_recruiter_audit_events.py` | Competed with `051_company_role_fields` for `051` |
| `051_recruiter_application_scorecards.py` | **Duplicate revision ID `051`** |
| `051_recruiter_pipeline_status.py` | **Duplicate revision ID `051`** |
| `052_merge_recruiter_051_heads.py` | Merge revision — invalid on clean scaffold |
| `052_recruiter_manual_scheduling.py` | **Duplicate revision ID `052`** |

**Rule:** Never copy WIP migration files into scaffold. Re-create with next free sequential ID from current head.

---

## Planned sequence (post-055)

| Order | Workstream | New revision ID | Suggested filename | Depends on |
|---|---|---|---|---|
| 6 | Recruiter notes/scorecards | `056_recruiter_application_scorecards` | `056_recruiter_application_scorecards.py` | `055_recruiter_manual_scheduling` |
| 7 | Candidate evidence vault | `057_candidate_evidence_items` | `057_candidate_evidence_items.py` | previous merged head |
| 8+ | Future backend workstreams | `058_*`, `059_*`, … | one file per workstream | previous merged head |

### Frontend-only workstreams (no migration)

These rebuild phases require **no Alembic revision**:

- Investor Room MVP
- Investor Metrics / Reality Dashboard
- Investor Roadmap / Founder Updates (partial — already merged without migration)
- Investor Data Room / Request Access
- Company Hiring Dashboard
- Recruiter message drafts (merged — no new migration)
- Recruiter candidate search (if API-only on existing tables)
- Recruiter analytics (if read-only aggregates)
- Recruiter integrations readiness (config/docs only)
- Company jobs/roles, team permissions, pipeline quality, billing readiness — **confirm schema need per PR**; default none until spec requires new tables

---

## Per-PR migration rules

1. **One PR = one migration max** for backend workstreams that need schema changes.
2. **`down_revision`** must equal current scaffold head at PR open time (rebase if another backend PR merged first).
3. **Never reuse** revision strings from WIP (`051` duplicates, merge revisions, or stale renumbers).
4. **No merge migrations** unless two heads exist on production (avoid — use linear renumber instead).
5. **No destructive ops** (`DROP TABLE`, column drops) without founder approval and runbook.
6. Run `alembic heads` and `pytest tests/test_alembic_single_head.py` in CI; fail if multiple heads detected.
7. Ship migration + ORM model + service + tests in the **same PR** (audit trail pattern).

---

## Implementation checklist (per backend workstream)

```text
[ ] git switch -c feature/<workstream> origin/cursor/phase1-monorepo-scaffold
[ ] alembic heads  →  confirm single head
[ ] Create backend/alembic/versions/0NN_<name>.py with down_revision = current head
[ ] Add ORM model + service + API routes + pytest
[ ] alembic upgrade head (local/dev DB)
[ ] pytest backend/tests/test_<workstream>.py tests/test_alembic_single_head.py
[ ] PR → merge → confirm production head advanced before next backend workstream
```

---

## Railway deploy note

`start-api.sh` runs `alembic upgrade head` before uvicorn. Multiple heads or duplicate revision IDs prevent startup and fail the healthcheck. After merging migration PRs, trigger a Railway redeploy on the API service so the new chain runs against the DB.

---

## Candidate evidence vault

Claims next free revision after scheduling merges (planned `057_candidate_evidence_items`). WIP `054_candidate_evidence_items.py` from stash is **reference only** — renumber with corrected `down_revision`.
