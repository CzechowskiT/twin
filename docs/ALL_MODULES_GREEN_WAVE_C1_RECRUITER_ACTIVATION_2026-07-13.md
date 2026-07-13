# All modules green — Wave C Slice 1: Recruiter workspace activation (2026-07-13)

> **Stance:** P0 CLOSED | Gate E PASS | Gate F PENDING | Launch NO-GO  
> **NOT_GATE_F_YES:** true  
> **NOT_PHASE_3B:** true  
> **Base scaffold SHA:** `c2a08b025ca950b341540f0bc80f710825c778ce`

## Summary

Wave C slice 1 delivers **recruiter workspace activation onboarding** with PostgreSQL persistence, authenticated GET API, hub onboarding panel, and automatic step recording from inbox load + first decision. Aligns with `docs/LIMITED_RECRUITER_PILOT_TRACKER_2026-06-06.md` R1 Activation dimension.

## Activation event (repo-defined)

Per **LIMITED_RECRUITER_PILOT_TRACKER**:
- **First queue load** — successful `/recruiter/inbox` load (empty queue = PASS)
- **First decision** — first accept or decline = **activation completion event**

## Scope delivered

| Layer | Deliverable |
|-------|-------------|
| DB | `recruiter_workspace_activation` + `recruiter_activation_events` |
| Migration | `071_recruiter_workspace_activation` |
| API | `GET /api/v1/recruiter/activation` + hooks on inbox load/respond |
| FE | `RecruiterActivationPanel` on `/recruiter` hub |
| Guard | `test:all-modules-green-wave-c1-recruiter-activation-guard` |

## Module status

| Field | Value |
|-------|-------|
| Module ID | `recruiter_daily_cockpit` / `daily_cockpit` |
| Route | `/recruiter/daily-cockpit` (+ hub panel on `/recruiter`) |
| Activation | **PILOT** (not GREEN_WORKING) |
| Browser smoke | **NEEDS_FOUNDER_AUTH_SMOKE** — no recruiter token in founder doc |

Daily cockpit demo queues **unchanged** — persistence tracks onboarding only.

## Excluded (unchanged)

- Auto-apply (PAUSED)
- Delegated apply (OFF)
- Stripe checkout
- ATS writeback
- Microsoft/Google calendar live sync
- Fake traction metrics

## API contract

### GET `/api/v1/recruiter/activation`

Requires recruiter token + `company_slug`. Returns steps, completion %, next action href, pilot/smoke status.

Steps auto-recorded:
1. `connect_workspace` — token validated
2. `load_inbox_queue` — first inbox GET
3. `first_decision` — first accept/decline POST

## Tests

```bash
cd backend && pytest tests/test_recruiter_activation_persistence.py -q
cd frontend && npm run test:all-modules-green-wave-c1-recruiter-activation-guard
cd frontend && npm run test:candidate-green-modules-founder-smoke-guard
```

## Next batch

Founder browser smoke: pilot recruiter token → `/recruiter` → connect → inbox load → first decision → verify persistence. On pass: document in founder smoke runbook; consider flipping daily cockpit toward GREEN_WORKING in a later wave.
