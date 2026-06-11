# Company jobs and roles management MVP — 2026-06-11

Branch: `feature/company-jobs-roles-management-mvp-2026-06-11`

## Route

`/company/roles` — list, create, and edit internal employer roles (draft / active / paused / closed).

## API

- `GET|POST /api/v1/company/roles`
- `GET|PATCH /api/v1/company/roles/{id}`

Auth: recruiter company token + `company_slug` (same as recruiter inbox).

## Features

- Role requirements, must-have / nice-to-have skills
- Location, work mode, optional salary
- Linked candidates count (applications + matches)
- Role quality checklist (5 items)
- Read-only UI when proxy returns 503 (API not configured)

## Hard bans

No external job posting, no scraping, no fake publishing. **Public launch NO-GO** unchanged.

## Tests

```bash
cd backend && pytest tests/test_company_roles.py -q
cd frontend && npm run test:company-jobs-roles-management-mvp
npm run test:pii-data-visibility
npm run test:trust-language-guard
npm run lint && npx tsc --noEmit && npm run build
```
