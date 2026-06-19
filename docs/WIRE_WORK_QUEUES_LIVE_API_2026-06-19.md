# Wire Work Items + Review Queue Live API — 2026-06-19

Routes wired with live API + demo fallback on 401/403:
- `/recruiter/work-items`, `/company/work-items`
- `/recruiter/trust-review-queue`, `/recruiter/review-queue`
- `/recruiter/operational-work-queue`

## Test plan

```bash
cd frontend && npm run test:wire-work-queues-live-api
```
