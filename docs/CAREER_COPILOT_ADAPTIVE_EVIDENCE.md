# Adaptive Career Intelligence — Evidence

**Epic:** 1.1 Adaptive Career Intelligence  
**Branch:** `cursor/phase1-monorepo-scaffold`  
**Alembic:** `108_adaptive_career_intelligence`  

## Implementation evidence (repo)

| WS | Deliverable | Location |
|----|-------------|----------|
| WS1 Memory | versioned memories | `career_copilot_adaptive.record_memory` |
| WS2 Prefs | explicit-only inference | `infer_preferences` + `FORBIDDEN_PREF_KEYS` |
| WS3 Ranking | explainable factors | `rank_recommendations` |
| WS4 Opportunity | fit + unknowns | `opportunity_intelligence` |
| WS5 Timeline | events | `candidate_career_timeline_events` |
| WS6 Skills | evolution + exercises | `refresh_skill_evolution` |
| WS7 Health | 8 dimensions explained | `compute_health_score` |
| WS8 Scenarios | unlimited options | `create_scenario` |
| WS9 Learning loop | persist answers | `submit_learning_loop` |
| WS10 Evolution | reuse aggregate | `build_adaptive_aggregate` |
| WS11 Explainability 2.0 | inputs/unknowns | `explainability_2` block |
| WS12 Human control | edit memory / pref override | API PATCH/POST |
| WS13 Safety | no fabricate / no protected | tests + claims |
| WS14 UX | tabs PL/EN | `career-copilot-panel.tsx` + i18n |
| WS15 Analytics | kpi_excluded | adaptive.analytics |
| WS16 Reliability | versioning / archive | memory supersede |
| WS17 Tests | `test_career_copilot_adaptive.py` | pytest |
| WS18 Docs | this + CAREER_COPILOT_ADAPTIVE.md | docs/ |
| WS19 Deploy | scaffold push; Alembic 108 | pending prod SHA |

## Tests

```bash
cd backend && python -m pytest tests/test_career_copilot_adaptive.py -q
```

## Production evidence

Fill after deploy:

- `repo_head`:
- `prod_frontend_commit`:
- `prod_api_commit`:
- `prod_worker_commit`:
- `alembic_current`:
- `smoke_url`:
- `alignment_status`:

## Stance confirmation

- Launch NO-GO
- Enrollment OFF
- Phase 3B BLOCKED
- Phase 3 Autonomous Career Agent: NOT STARTED
- Candidate-first primary
- synthetic ≠ real
- invites: 0 (unless Founder authorized)
- no ALTEN

## Verdict policy

**A** only with production evidence of adaptive aggregate + Alembic 108 live.  
Otherwise **B** with exact product blockers.
