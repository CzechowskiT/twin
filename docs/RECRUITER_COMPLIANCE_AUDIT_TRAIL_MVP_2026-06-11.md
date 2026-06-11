# Recruiter compliance audit trail MVP (2026-06-11)

## Goal
Append-only log of recruiter-side actions on an application — trust and compliance without storing decline notes or candidate PII in the audit ledger.

## Shipped scope
- **DB:** `recruiter_audit_events` (Alembic `051_recruiter_audit_events`, `down_revision = 050_stripe_webhook_events`)
- **Auto-logged:** accept → `decision_accept`, decline → `decision_decline` (via `recruiter_inbox.respond_recruiter_batch`)
- **Client-logged:** review card expand → `review_opened` (POST allowed types only)
- **API:** `GET/POST /api/v1/recruiter/inbox/{application_id}/audit` (same recruiter token + company slug as inbox)
- **UI:** “Action history” / “Historia działań” panel on expanded review card; trust copy that AI does not make hiring decisions

## Meta policy
Allowed keys: `status_before`, `status_after`, `source`. Forbidden: `decline_note`, names, email, message bodies, etc.

## Out of scope (follow-up PRs)
Pipeline transitions, scorecard notes, message draft copy events, scheduling marks — hook when those workstreams merge.

## Verification
```bash
cd backend && python3 -m pytest tests/test_recruiter_audit_trail.py -q
cd frontend && npm run test:recruiter-audit-trail-mvp
```
