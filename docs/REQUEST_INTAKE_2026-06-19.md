# Request Intake Append Queue — 2026-06-19

**API:** `GET/POST/PATCH /api/v1/request-intake` (no DELETE)  
**Routes:** `/recruiter/request-intake`, `/dashboard/trust/request-intake-preview`

## Test plan

```bash
cd backend && pytest tests/test_request_intake.py -q
cd frontend && npm run test:request-intake
```
