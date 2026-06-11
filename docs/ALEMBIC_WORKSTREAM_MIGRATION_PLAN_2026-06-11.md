# Alembic Workstream Migration Plan — 2026-06-11

**Purpose:** Define a linear, conflict-free Alembic revision chain before any backend multi-persona MVP PR merges.

**Scaffold branch:** `cursor/phase1-monorepo-scaffold` @ `cd4b698` (2026-06-11).

---

## Current scaffold migration head

| Field | Value |
|---|---|
| **Head revision** | `050_stripe_webhook_events` |
| **File** | `backend/alembic/versions/050_stripe_webhook_events.py` |
| **Parent (`down_revision`)** | `049_job_match_feedback` |
| **Tables added** | `stripe_webhook_events` (dedup ledger) |

Verify locally:

```bash
cd backend && alembic heads   # expect single head: 050_stripe_webhook_events
```

---

## WIP conflict summary (do not merge)

The archived dirty tree (`wip/multi-persona-mvp-local-snapshot-2026-06-11` @ `1c35bce`) and `stash@{45}` contain **parallel unmerged revisions**:

| WIP file | Problem |
|---|---|
| `051_recruiter_audit_events.py` | Competes for revision `051` |
| `051_recruiter_application_scorecards.py` | **Duplicate revision ID `051`** |
| `051_recruiter_pipeline_status.py` | **Duplicate revision ID `051`** |
| `052_merge_recruiter_051_heads.py` | Merge revision — invalid on clean scaffold |
| `052_recruiter_manual_scheduling.py` | **Duplicate revision ID `052`** |
| `053_recruiter_audit_events.py` | Out-of-order vs intended audit-first strategy |
| `054_candidate_evidence_items.py` | Depends on unmerged WIP chain |

**Rule:** None of the above files may be copied into a clean PR. Re-create migrations with new sequential IDs from scaffold head `050`.

---

## Linear chain strategy

Each backend workstream gets **exactly one** new revision, appended in rebuild order. `down_revision` always points to the **previous merged** revision on `cursor/phase1-monorepo-scaffold`.

### Planned sequence (post-050)

| Order | Workstream | New revision ID | Suggested filename | Depends on |
|---|---|---|---|---|
| 1 | Recruiter audit trail | `051_recruiter_audit_events` | `051_recruiter_audit_events.py` | `050_stripe_webhook_events` |
| 2 | Recruiter pipeline | `052_recruiter_pipeline_status` | `052_recruiter_pipeline_status.py` | `051_recruiter_audit_events` |
| 3 | Recruiter notes/scorecards | `053_recruiter_application_scorecards` | `053_recruiter_application_scorecards.py` | `052_recruiter_pipeline_status` |
| 4 | Recruiter manual scheduling | `054_recruiter_manual_scheduling` | `054_recruiter_manual_scheduling.py` | `053_recruiter_application_scorecards` |
| 5 | Candidate evidence vault | `055_candidate_evidence_items` | `055_candidate_evidence_items.py` | `054_recruiter_manual_scheduling` |
| 6+ | Future backend workstreams | `056_*`, `057_*`, … | one file per workstream | previous merged head |

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
3. **Never reuse** revision strings from WIP (`051` duplicates, merge revisions, or renumbered `053`/`054` from stash).
4. **No merge migrations** unless two heads exist on production (they do not — scaffold has single head `050`).
5. **No destructive ops** (`DROP TABLE`, column drops) without founder approval and runbook.
6. Run `alembic heads` in CI; fail if multiple heads detected.
7. Ship migration + ORM model + service + tests in the **same PR** (audit trail pattern).

---

## Implementation checklist (per backend workstream)

```text
[ ] git switch -c feature/<workstream> origin/cursor/phase1-monorepo-scaffold
[ ] alembic heads  →  confirm single head
[ ] Create backend/alembic/versions/0NN_<name>.py with down_revision = current head
[ ] Add ORM model + service + API routes + pytest
[ ] alembic upgrade head (local/dev DB)
[ ] pytest backend/tests/test_<workstream>.py
[ ] PR → merge → confirm production head advanced before next backend workstream
```

---

## Audit trail first (when backend starts)

When Phase 2 begins, **Recruiter Audit Trail** claims `051_recruiter_audit_events`:

- `down_revision = "050_stripe_webhook_events"`
- Table: `recruiter_audit_events` (append-only event log)
- Service: `recruiter_audit_trail.py` — reuse logic from archive/stash@{42}, **not** WIP migration file

Subsequent recruiter backend workstreams inherit the chain in order (pipeline → scorecards → scheduling).

---

## Candidate evidence vault

Claims next free revision after scheduling merges (planned `055_candidate_evidence_items`). WIP `054_candidate_evidence_items.py` from stash is **reference only** — renumber to `055` with corrected `down_revision`.

---

## This recovery PR

**Docs only.** No migration files created or modified in `docs/multi-persona-workstream-recovery-2026-06-11`.
