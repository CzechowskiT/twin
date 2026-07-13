# All modules green — Wave C Slice 2: Talent Pool + Trust Review Queue (2026-07-13)

> **Stance:** P0 CLOSED | Gate E PASS | Gate F PENDING | Launch NO-GO  
> **NOT_GATE_F_YES:** true  
> **NOT_PHASE_3B:** true  
> **Base:** stacked on Wave C1 (#449) · scaffold `c2a08b025ca950b341540f0bc80f710825c778ce`

## Summary

Wave C slice 2 delivers **PostgreSQL persistence** for recruiter Talent Pool (manual add, filter, detail, archive, privacy-safe snapshots) and Trust Review Queue (list, consent-safe review items synced from Trust Center privacy requests, approve/reject/request clarification, append-only decision history).

## Scope delivered

| Layer | Deliverable |
|-------|-------------|
| DB | Extend `recruiter_talent_pool_records`; new `recruiter_trust_review_items`, `recruiter_trust_review_decisions` |
| Migration | `072_recruiter_talent_pool_trust_review_c2` (after `071_recruiter_workspace_activation`) |
| API | Talent pool: GET list/filter, POST add, GET detail, PATCH archive. Trust review: GET list, GET detail, POST decision, GET decision history |
| FE | `/recruiter/talent-pool` — add form, filter, detail, archive. `/recruiter/trust-review-queue` — live queue + decision panel |
| Guard | `test:all-modules-green-wave-c2-talent-pool-trust-review-guard` |

## Module status

| Module ID | Route | Status | Browser smoke |
|-----------|-------|--------|---------------|
| `recruiter_talent_pool` / `talent_pool` | `/recruiter/talent-pool` | **PILOT** | **NEEDS_FOUNDER_AUTH_SMOKE** |
| `recruiter_trust_review_queue` / `trust_review_queue` | `/recruiter/trust-review-queue` | **PILOT** | **NEEDS_FOUNDER_AUTH_SMOKE** |

## Trust Center integration (#447)

- Open `candidate_privacy_requests` from applicants to company jobs sync into recruiter trust review queue (idempotent)
- Consent visibility respected: `talent_pool_opt_in`, hidden/revoked states block pool add
- No automated deletion, export, or outreach fulfillment — decisions logged only

## Recruiter Activation (#449) — independence

C2 trust review decisions are **not** the R1 activation `first_decision` event (inbox accept/decline). No changes to `recruiter_activation_persistence.py` R1 definition.

## Excluded (unchanged)

- Auto-apply (PAUSED)
- Delegated apply (OFF)
- Stripe checkout
- ATS writeback
- Microsoft/Google calendar live sync
- Fake traction metrics or smoke

## API contract (recruiter token + company_slug)

### Talent pool

- `GET /api/v1/recruiter/talent-pool` — list (+ optional `search`, `include_archived`, filters)
- `POST /api/v1/recruiter/talent-pool/candidates` — manual add with idempotent duplicate detection
- `GET /api/v1/recruiter/talent-pool/{id}` — detail with privacy-safe snapshot
- `PATCH /api/v1/recruiter/talent-pool/{id}` — archive (soft)

### Trust review queue

- `GET /api/v1/recruiter/trust-review-queue` — list + sync from privacy requests
- `GET /api/v1/recruiter/trust-review-queue/{id}` — detail + decisions
- `POST /api/v1/recruiter/trust-review-queue/{id}/decisions` — approve | reject | request_clarification
- `GET /api/v1/recruiter/trust-review-queue/{id}/decisions` — decision history

## Tests

```bash
cd backend && pytest tests/test_recruiter_c2_persistence.py -q
cd backend && pytest tests/test_recruiter_activation_persistence.py tests/test_review_queue.py -q
cd frontend && npm run test:all-modules-green-wave-c2-talent-pool-trust-review-guard
cd frontend && npm run test:all-modules-green-wave-c1-recruiter-activation-guard
cd frontend && npm run test:candidate-green-modules-founder-smoke-guard
cd frontend && npm run build
```

## Next batch

Founder browser smoke with pilot recruiter token: load talent pool → add candidate → archive → open trust review queue → record decision → refresh verify persistence. Document PASS in founder smoke runbook before flipping modules toward GREEN_WORKING.
