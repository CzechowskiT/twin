# All modules green — Wave B Slice 1: Candidate Career Compass (2026-07-10)

> **Stance:** P0 CLOSED | Gate E PASS | Gate F PENDING | Launch NO-GO  
> **NOT_GATE_F_YES:** true  
> **NOT_PHASE_3B:** true  
> **PR #445 merge SHA:** `6d7083e37daf9a88783c938e0c5a661168111e81`

## Summary

Wave B slice 1 delivers **full persistence** for Candidate Career Compass: PostgreSQL table, authenticated CRUD API, rebuilt `/dashboard/career` UI, and readiness integration. No gamified AI scoring or demo hardcoding.

## Scope delivered

| Layer | Deliverable |
|-------|-------------|
| DB | `candidate_career_compass` — one row per candidate, FK + unique index |
| Migration | `069_candidate_career_compass` — safe upgrade/downgrade |
| API | `GET/PUT/PATCH /api/v1/candidates/me/career-compass` |
| Readiness | Brief complete when `target_role` + `target_seniority` + ≥1 priority + ≥1 next_step |
| FE | Sections: target, compensation, priorities, strengths/gaps, next actions, notes |
| Guard | `test:all-modules-green-wave-b1-career-compass-guard` |

## Module status

| Field | Value |
|-------|-------|
| Module ID | `candidate_career_compass` / `career_compass` |
| Route | `/dashboard/career` |
| Activation | **PILOT** (not GREEN_WORKING) |
| Browser smoke | **NEEDS_FOUNDER_AUTH_SMOKE** — no demo password in repo |

Change to **LIVE / GREEN_WORKING** only after founder browser smoke on production with `demo@twin.career`.

## Excluded (unchanged)

- Auto-apply (PAUSED)
- Delegated apply (OFF)
- Stripe checkout
- ATS writeback
- Microsoft calendar live sync

## API contract

### GET `/api/v1/candidates/me/career-compass`

Returns compass fields, `completion_percent`, `missing_fields`, `readiness_complete`, `updated_at`. Empty state when not configured.

### PUT `/api/v1/candidates/me/career-compass`

Full upsert. Validates enums, salary min≤max, list limits.

### PATCH `/api/v1/candidates/me/career-compass`

Partial update with same validation rules.

## Readiness rule

Career brief checklist item is **complete** when persisted compass has:

1. `target_role` (non-empty)
2. `target_seniority` (valid enum)
3. ≥1 `career_priority`
4. ≥1 `next_step`

Delegated apply remains **OFF**. Auto-apply remains **PAUSED**.

## Tests

```bash
cd backend && pytest tests/test_candidate_career_compass_persistence.py -q
cd frontend && npm run test:all-modules-green-wave-b1-career-compass-guard
```

## Next batch

Founder browser smoke: login `demo@twin.career` → `/dashboard/career` → edit → save → refresh → verify persistence + readiness card. On pass: flip `CAREER_COMPASS_SHIP_STATUS` to `live`, activation to LIVE/green.
