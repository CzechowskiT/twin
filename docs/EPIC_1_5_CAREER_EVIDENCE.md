# Epic 1.5 — Career Evidence, Portfolio & Proof-of-Competence

**Branch:** `cursor/phase1-monorepo-scaffold`  
**Alembic:** `111_career_evidence_portfolio`  
**Stance:** Launch NO-GO · Enrollment OFF · Phase 3B BLOCKED · MS Calendar write OFF · public portfolio OFF · Phase 3 Agent NOT_STARTED · synthetic ≠ real

## Product

Candidate-owned, source-backed evidence chain:

`source → evidence → claim → skill link → role relevance → application/interview usage`

TWIN extracts proposed evidence, never invents achievements/metrics. Claim labels: FACT, CANDIDATE_CONFIRMED, SOURCE_SUPPORTED, INFERENCE, SUGGESTION, UNKNOWN, DISPUTED, REDACTED.

## Surfaces

| Surface | Path |
|---|---|
| API aggregate | `GET /api/v1/candidates/me/career-evidence` |
| Private portfolio | `GET /api/v1/candidates/me/portfolio` + FE `/dashboard/portfolio` |
| Sources / extract | `POST .../sources`, `POST .../extract` |
| Confirmation | `POST .../fields/{id}/action` |
| Builders | achievements, projects, case studies, stories, CV audit/bullets, packs |
| Export / delete | `GET .../export`, `POST .../history/delete` |

## Proof

- Backend: `pytest tests/test_career_evidence.py`
- Authenticated synthetic E2E: `scripts/career-evidence-authenticated-e2e.py` (ops mint, kpi_excluded)
- Hard bans preserved: no public portfolio URL, no MS write, no auto-apply, no external profile write, no reference outreach, no autonomous publishing

## Integration

- Acceptance Calendar: evidence-building tasks via `evidence:task:{id}` under fatigue-safe upsert
- Daily OS: completeness tasks surface through Acceptance Calendar / brief path
- Adaptive memory: privacy flags (`memory_reuse_opt_in`) — no sensitive source duplication in exports
