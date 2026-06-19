# Candidate Visibility Preference Store — 2026-06-19

**Branch:** `backend/candidate-visibility-preferences-2026-06-19`  
**API:** `GET/POST/PATCH /api/v1/candidate-visibility-preferences` (no DELETE)  
**Routes:** `/dashboard/trust/controls` (link), `/dashboard/trust/visibility-preferences`, `/profile/trust/visibility-preferences`

## Purpose

Internal TWIN visibility state only — no external publication, no recruiter/company notification, no email, no ATS writeback. Every POST/PATCH emits append-only AuditEvent.

## Test plan

```bash
cd backend && pytest tests/test_candidate_visibility_preferences.py -q
cd frontend && npm run test:candidate-visibility-preferences
```

Prod smoke:

```bash
PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app npm run test:candidate-visibility-preferences-browser
```
