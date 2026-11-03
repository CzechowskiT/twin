# AI Candidate Intelligence — first real pilot validation OS

**Verdict (no approved org):**  
`AI CANDIDATE INTELLIGENCE REAL-CUSTOMER VALIDATION READY — AWAITING FOUNDER-APPROVED PILOT ORGANIZATION`

## Rules

- Never invent org / recipient / approval / CV / KPI.
- Synthetic CU smoke ≠ real-customer validation.
- Real adoption/value scores stay **0** until non-synthetic FOUNDER_APPROVED activity with disclosure.
- Invitation packs stay **READY_UNSENT** until separate Founder send authorization.
- Launch stays **NO-GO** — AI validation does not flip Launch GO.

## Surfaces

| Surface | Path |
|---------|------|
| Service | `backend/app/services/ai_intel_validation.py` |
| API command view | `GET /api/v1/admin/pilot-os/ai-validation` |
| Safety gate | `GET /api/v1/admin/pilot-os/ai-validation/safety-gate` |
| Pilot OS UI | `/admin/pilot-os` (AI validation panel) |
| Alembic | `104_ai_intel_validation` |
| Machine doc | `docs/AI_CANDIDATE_INTELLIGENCE_REAL_VALIDATION.json` |

## Default validation scope

1 org · 1–3 recruiters · 1–3 roles · 10–30 CVs · no outreach · no ATS write · no autonomous decision.

## Kill switch

Set `AI_INTEL_KILL_SWITCH=1` to block real AI activation path (verdict → VALIDATION BLOCKED).
