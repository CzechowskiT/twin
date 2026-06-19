# Read-only Export Request Endpoint — 2026-06-19

**API:** `GET/POST /api/v1/export-requests` (no PATCH/DELETE)  
**Routes:** `/dashboard/trust/export-preview`, `/dashboard/trust/audit-export`, `/dashboard/trust/consent-receipt`, `/dashboard/trust/export-requests`

## Test plan

```bash
cd backend && pytest tests/test_export_requests.py -q
cd frontend && npm run test:export-requests
```
