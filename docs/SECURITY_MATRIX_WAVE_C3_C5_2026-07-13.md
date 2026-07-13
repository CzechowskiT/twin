# Security matrix — Wave C3–C5 + candidate timeline (2026-07-13)

> **Stance:** Launch NO-GO · Gate F PENDING · no LIVE flips

| Surface | AuthZ | Tenant isolation | PII in audit | External send | Status |
|---------|-------|------------------|--------------|---------------|--------|
| C3 notification prefs | Recruiter token + company slug | Per `company_slug` row | No | **Banned** (in-app only) | PILOT |
| C4 saved views | Recruiter token | Per company + surface | Filter JSON only | N/A | PILOT |
| C5 activity timeline | Recruiter token | Company-scoped read | Sanitized meta only | N/A | PILOT |
| Candidate timeline | Session `/me` | User-scoped read | Trust events only | N/A | PILOT |

**Hard bans enforced:** no Stripe LIVE · no ATS writeback · no MS Calendar write · no auto-apply · no external notifications.

Regression: `backend/tests/test_recruiter_c3_notification_prefs.py`, `test_recruiter_c4_saved_views.py`, `test_recruiter_c5_activity_timeline.py`, tenancy tests in #451 batch.
