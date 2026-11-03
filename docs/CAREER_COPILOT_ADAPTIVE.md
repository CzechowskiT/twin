# Adaptive Career Intelligence (Epic 1.1)

**Status:** Product extension of Career Copilot 2.0  
**Alembic:** `108_adaptive_career_intelligence`  
**API:** `/api/v1/candidates/me/career-copilot` (+ adaptive subroutes)  
**UI:** `/dashboard/career` — tabs Timeline, Skills, Memory, Health, Scenarios, Learning  
**Phase 3 Autonomous Career Agent:** NOT STARTED  

## Mission

Turn Career Copilot into an adaptive intelligence system that becomes more accurate after every interaction — never silently, never overwrite history, always explain why.

## Architecture

```
career_copilot.py (2.0 graph/directions/goals)
        │
        ▼
career_copilot_adaptive.py
  ├── Memory Engine (versioned, auditable)
  ├── Preference Learning (explicit behavior only)
  ├── Recommendation Ranking (explainable factors)
  ├── Opportunity Intelligence
  ├── Career Timeline
  ├── Skill Evolution
  ├── Career Health Score
  ├── Scenario Comparison
  └── Learning Loop
```

GET/POST refresh returns `build_adaptive_aggregate` which **reuses** memory, preferences, timeline, health, graph, goals — never starts from zero (WS10).

## Models (Alembic 108)

| Table | Purpose |
|-------|---------|
| `candidate_copilot_memories` | Long-term memory with versioning / supersede |
| `candidate_copilot_preferences` | Inferred prefs + user override |
| `candidate_career_timeline_events` | Persistent timeline |
| `candidate_skill_evolution` | Gain / needs_practice / missing |
| `candidate_career_health_snapshots` | Explainable multi-dimension health |
| `candidate_learning_loop_entries` | Post-milestone feedback |
| `candidate_career_scenarios` | Unlimited scenario comparisons |

## Safety

- No protected-attribute inference (`age`, `gender`, … rejected)
- No invented salary / market / recruiter intent / company strategy → UNKNOWN
- Kill-switch / rules fallback preserved
- `kpi_excluded: true` on adaptive analytics
- Human editable / reversible — edits archive prior versions

## Stance (frozen)

Launch NO-GO · Enrollment OFF · Phase 3B BLOCKED · invite-only · Phase 3 Agent not started · candidate-first · synthetic ≠ real

## Runbook

1. Deploy API/worker with Alembic upgrade to `108_adaptive_career_intelligence`
2. Deploy frontend (Career Copilot panel adaptive tabs)
3. Smoke: `GET /api/v1/candidates/me/career-copilot` → `adaptive.evolution.never_starts_from_zero`
4. Verify topology `alembic_head_expected` = `108_adaptive_career_intelligence`
