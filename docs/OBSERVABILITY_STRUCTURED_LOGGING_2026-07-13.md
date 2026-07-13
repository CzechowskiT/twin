# Observability — structured logging & redaction (2026-07-13)

> **Status:** CURRENT  
> **Guard:** `npm run test:observability-redaction-guard`

---

## Structured logging contract

| Field | Required | Redaction |
|-------|----------|-----------|
| `event` | yes | — |
| `user_id` | when auth | hash in prod logs optional |
| `company_slug` | recruiter routes | — |
| `request_id` | API requests | — |
| `duration_ms` | slow paths | — |

## Never log

- Passwords, tokens, `X-Twin-Recruiter-Token`, JWT bodies
- Full CV text, email bodies
- Stripe secrets, OAuth refresh tokens
- `DEMO_USER_PASSWORD` or any founder smoke credential

## Wave B/C metrics (pilot)

| Metric | Module | Notes |
|--------|--------|-------|
| `career_compass_save_total` | B1 | counter |
| `trust_privacy_request_total` | B2 | counter by status |
| `recruiter_activation_complete_total` | C1 | per company_slug |
| `talent_pool_record_total` | C2 | active vs archived |
| `trust_review_decision_total` | C2 | by outcome |

## Recruiter ops failure logging

| Failure | Log level | User-facing |
|---------|-----------|-------------|
| 401 recruiter token | warn | "Session expired" |
| 404 company_slug | info | not-found page (no leak) |
| 409 duplicate pool record | info | inline error |
| 503 DB unavailable | error | retry banner |

See `docs/RECRUITER_OPS_FAILURE_STATES_2026-07-13.md` for UI states.
