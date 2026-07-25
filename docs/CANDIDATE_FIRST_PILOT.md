# Candidate-First Pilot — primary product validation

**Primary product:** candidate  
**Org / B2B first-customer path:** `SECONDARY_B2B_PILOT_PATH — NOT PRIMARY PRODUCT VALIDATION`  
**ALTEN org pack:** NOT PREPARED (explicit Founder decision)

## Verdicts

| Code | String |
|------|--------|
| A | `CANDIDATE-FIRST PILOT READY — REAL CANDIDATE COHORT CAN BE INVITED` |
| B | `CANDIDATE-FIRST PILOT INCOMPLETE — EXACT CANDIDATE JOURNEY BLOCKERS` |
| C | `CANDIDATE-FIRST PILOT ACTIVE — FIRST REAL CANDIDATES ONBOARDED` |

## Journey (primary)

understand → direction → opportunities → fit/gaps → prepare → decide/act → recruitment support → learn

## Ops surfaces

- Control plane: `GET /api/v1/admin/pilot-os/candidate-first`
- Synthetic E2E (40 steps, no mail): `GET /api/v1/admin/pilot-os/candidate-first/synthetic-e2e`
- UI: `/admin/pilot-os` panel **Candidate-first pilot (PRIMARY)**
- Machine: `docs/CANDIDATE_FIRST_TAXONOMY.json`
- Alembic: `105_candidate_first_pilot`

## Founder flow (no invent)

1. Create non-synthetic cohort  
2. Approve with cohort ref + DPA + success criteria refs  
3. Add named recipient emails (hashed/masked storage)  
4. Prepare pack → `READY_UNSENT`  
5. Run send-safety (without send)  
6. Separate `founder_send_approval_ref` required to send later  

## Frozen stance

Launch NO-GO · Enrollment OFF · Phase 3B BLOCKED · invite-only · auto-apply OFF for pilot default · no false AI claims
