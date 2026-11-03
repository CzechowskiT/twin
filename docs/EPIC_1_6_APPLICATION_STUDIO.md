# Epic 1.6 — Application Studio (Evidence-Backed Tailoring & Submission Readiness)

**Branch:** `cursor/phase1-monorepo-scaffold`  
**Alembic:** `112_application_studio`  
**Stance:** Launch NO-GO · Enrollment OFF · Phase 3B BLOCKED · MS Calendar write OFF · public portfolio/apps OFF · auto-apply OFF · external submit OFF · Phase 3 Agent NOT_STARTED · synthetic ≠ real

## Product

Candidate-owned application preparation chain:

`opportunity → requirements → evidence-backed fit → strategy → tailored CV → cover letter → screening → checklist → candidate approval → candidate-declared submission → interview handoff`

TWIN prepares and gates readiness. TWIN never submits externally. `SUBMITTED` / `SENT` / `DELIVERED` are forbidden without candidate-declared provenance.

## Surfaces

| Surface | Path |
|---|---|
| FE workspace | `/dashboard/application-studio` |
| API aggregate | `GET /api/v1/candidates/me/application-studio` |
| Workspaces | `POST/GET .../workspaces` |
| Fit refresh | `POST .../refresh-fit` |
| CV / cover / screening / assets | `POST .../cv-draft`, `cover-letter`, `screening`, `assets` |
| Approval / declare / handoff | `POST .../approve`, `declare-submission`, `interview-handoff` |
| Export / delete / privacy | `GET .../export`, `POST .../delete`, `PATCH .../privacy` |
| Daily OS brief (404 debt closed) | `GET /api/v1/candidates/me/daily-os/brief` |

## Hard bans preserved

- No external submit / ATS write / LinkedIn write / email send / SMS / auto-apply
- No public application assets
- Sensitive screening questions never auto-completed
- CV drafts require confirmed evidence lineage
- Confidential evidence omitted from export by default
- Evidence deletion purges studio refs

## Proof

- Backend: `pytest tests/test_application_studio.py`
- Authenticated synthetic E2E: `scripts/application-studio-authenticated-e2e.py` (≥160 checks, ops mint, kpi_excluded)
- Topology guard expects Alembic `112_application_studio`

## Residual Epic 1.5 debt closure (explicit)

| Item | Disposition |
|---|---|
| Full malware AV on source uploads | Deferred (non-blocking); studio does not widen attack surface |
| FE builders on single portfolio page | Reused; Application Studio links evidence via API, no duplicate vault |
| Docs tip vs runtime drift after docs-only commits | Reconciled on this epic by shipping runtime `112` + aligning topology guards |
| Daily OS brief path 404 debt | **CLOSED** — live `GET /me/daily-os/brief` alias to `ensure_daily_brief` |
| Evidence invalidation into downstream packs | **CLOSED** — `purge_all_evidence_refs` from evidence history delete |
