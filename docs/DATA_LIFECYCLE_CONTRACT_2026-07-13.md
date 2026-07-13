# Data lifecycle contract — Wave B/C modules (2026-07-13)

> **Status:** CURRENT  
> **Stance:** P0 CLOSED | Gate F PENDING | Launch NO-GO

Per-module retention, deletion, and export contracts for persistence slices in PRs #448–#450.

---

## Career Compass (B1)

| Aspect | Contract |
|--------|----------|
| Scope | Candidate-owned `career_compass` row per user |
| Retention | Until account deletion or explicit clear via PUT empty payload |
| Export | Included in candidate data export (GDPR) when export pipeline runs |
| Deletion | CASCADE on `users.id` delete |
| Audit | No PII in logs; goals/gaps stored as JSON columns |

## Trust Center (B2)

| Aspect | Contract |
|--------|----------|
| Scope | `candidate_privacy_requests`, consent receipts per candidate |
| Retention | Open requests until resolved; closed requests retained 24 months (pilot) |
| Export | Privacy request history in trust audit export |
| Deletion | Anonymize on account delete; append-only decision events preserved hashed |
| Cross-tenant | Candidate JWT only — no recruiter access to raw requests |

## Referrals (B3 — #448)

| Aspect | Contract |
|--------|----------|
| Scope | `candidate_referrals` per referrer user |
| Retention | Referral attribution rows retained for program duration |
| Deletion | Soft-disable referral code on account delete; stats anonymized |
| Abuse | Rate limits on code generation; self-referral blocked at signup |
| Export | Referral stats summary only — no referee PII in referrer export |

## Recruiter Activation (C1 — #449)

| Aspect | Contract |
|--------|----------|
| Scope | `recruiter_workspace_activation`, `recruiter_activation_events` per company_slug |
| Retention | Events append-only; activation state current snapshot |
| Deletion | Company-scoped purge via admin tooling (not automated in pilot) |
| Cross-tenant | `company_slug` + recruiter token required |

## Talent Pool (C2 — #450)

| Aspect | Contract |
|--------|----------|
| Scope | `recruiter_talent_pool_records` per company |
| Retention | Active until archived; archived retained 12 months (pilot) |
| Deletion | Archive ≠ delete; hard delete requires company admin (future) |
| Privacy | `snapshot_json` privacy-safe — no raw email/phone in pool list API |

## Trust Review Queue (C2 — #450)

| Aspect | Contract |
|--------|----------|
| Scope | `recruiter_trust_review_items`, `recruiter_trust_review_decisions` |
| Retention | Synced from candidate privacy requests; decisions append-only |
| Deletion | Item removed when privacy request closed + 90 days |
| Cross-tenant | Company slug isolation; forged slug returns 404 not 403 leak |

---

## Tests

- `backend/tests/test_data_lifecycle_contract.py` — static contract markers
- `frontend/scripts/data-lifecycle-contract-guard.test.ts` — doc presence + module IDs
