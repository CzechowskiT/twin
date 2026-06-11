# Recruiter manual scheduling MVP — 2026-06-11

## Scope

Manual interview scheduling for **accepted / to_contact** candidates in the recruiter inbox. Recruiters paste slot details, copy an invite message, and mark `invited` or `interview_scheduled`. **No** Google/Microsoft recruiter calendar sync, **no** email send, **no** automatic invite.

## UX

| Surface | Behaviour |
| ------- | --------- |
| Recruiter inbox (`/recruiter/inbox`) | **Zaproponuj terminy** / **Prepare interview invite** on accepted rows |
| Scheduling panel | Date, time, duration, optional meeting link; copyable invite; mark invited / scheduled |
| Pipeline card | Shows scheduled time when `manual_slot_at` is set |
| Recruiter calendar (`/recruiter/calendar`) | **Unchanged placeholder** — full sync **NOT LIVE** |

## Trust copy (i18n `recruiterScheduling.*`)

- Manual scheduling — TWIN does not sync recruiter calendar yet.
- TWIN does not send this invite automatically.
- Full recruiter calendar sync: not live.

## API

`POST /api/v1/recruiter/inbox/{application_id}/schedule`

```json
{
  "slot_date": "2026-06-15",
  "slot_time": "14:30",
  "duration_minutes": 45,
  "meeting_link": "https://meet.example/x",
  "scheduling_status": "invited"
}
```

Statuses: `invited` | `interview_scheduled`. Persists on `applications` (migration `055_recruiter_manual_scheduling`).

## Hard bans (unchanged)

- No recruiter Google/MS calendar OAuth or write
- No email sending from TWIN
- No automatic candidate invite
- Public launch **NO-GO**

## Tests

```bash
cd frontend && npm run test:recruiter-scheduling-mvp
cd backend && pytest tests/test_recruiter_scheduling.py -q
```

## Related

- Message drafts (`recruiterMessageDrafts.*`) — copy-only outreach, complementary
- Pipeline (`recruiter_pipeline_status`) — accept moves to `accepted`; schedule moves to `invited`
- `docs/PRODUCTION_REALITY_MATRIX_2026-05-27.md`
