# AI Candidate Intelligence — architecture

**Updated:** 2026-07-24  
**Branch:** `cursor/phase1-monorepo-scaffold`  
**Stance:** Launch NO-GO · Enrollment OFF · Phase 3B BLOCKED · Pilot READY (if multi-role green)

## Purpose

Reduce recruiter CV understanding time (~20–30s) with **explainable**, evidence-backed analysis.  
**Never** replaces human judgment, autonomous employment decisions, or protected-attribute inference.

## Architecture

```
CV upload (PDF/DOCX/TXT)
  → cv_parser + cv_enrichment (reuse)
  → enqueue Celery candidate_intelligence_tasks
  → candidate_intelligence.run_extraction_pipeline
       ├─ prompt-injection scan (ai_compliance)
       ├─ rules + optional Claude extract (scrubbed)
       ├─ timeline / signals / missing info
       ├─ deterministic MATCH|NO_MATCH|UNKNOWN
       └─ recruiter brief (factual vs inferred)
  → API /candidates/{id}/intelligence*
  → Recruiter UI CandidateIntelligencePanel
```

## Fit bands

| Band | Meaning |
|------|---------|
| `MATCH` | Enough evidenced overlap; still requires human review |
| `NO_MATCH` | Weak overlap |
| `UNKNOWN` | Missing evidence / ambiguity |

## Hard bans

- No race/ethnicity/religion/politics/union/orientation/health/disability/pregnancy/family/age/gender/nationality-from-name scoring
- No autonomous hire/reject
- Clarification drafts **never** auto-send
- Synthetic ≠ real KPI

## Surfaces

| Surface | Path |
|---------|------|
| Service | `backend/app/services/candidate_intelligence.py` |
| API | `backend/app/api/candidate_intelligence.py` |
| Task | `backend/app/tasks/candidate_intelligence_tasks.py` |
| Alembic | `103_candidate_intelligence` |
| UI | `frontend/src/components/recruiter/candidate-intelligence-panel.tsx` |
| Smoke | `scripts/candidate-intelligence-prod-smoke.py` |
| Machine doc | `docs/AI_CANDIDATE_INTELLIGENCE.json` |

## Corrections

Human corrections in `human_corrections_json` remain authoritative across regeneration.
Recruiter match overrides are audited in `override_audit_json`.
