# Daily Career OS — Epic 1.3 Evidence

**Epic:** 1.3 Daily Career OS Completion, Authenticated Product Proof and Notification Delivery  
**Branch:** `cursor/phase1-monorepo-scaffold`  
**Alembic:** `109_daily_career_os` (no new migration — delivery state in reminder payload_json)

## Gaps closed vs Epic 1.2

| Gap | Resolution |
|-----|------------|
| Worker lag / SHA drift | Backend+FE code change redeploys API/worker/FE to same tip |
| Unauthenticated-only proof | Ops mint + authenticated candidate JWT E2E script |
| Notification delivery path | Celery `career_reminders_sweep` + `deliver_career_reminder` |
| Quiet hours / consent | `in_quiet_hours` + email opt-in gate + dry-run API |
| Silent failure | Failed status + attempts in payload + Celery retries |

## Scheduler / notification

- Beat: `career-reminders-hourly` → `app.tasks.reminder_tasks.career_reminders_sweep`
- Per-item: `deliver_career_reminder` (max_retries=3, acks_late)
- Channels: `in_product` (default) → inbox item; `email` only with `email_reminders_opt_in` + mail configured
- Dry-run: `POST /me/career-copilot/daily/reminders/dry-run` and ops `POST /admin/pilot-os/daily-os/reminder-sweep` (default dry_run=true)
- No mass email · no SMS · no recruiter outreach · no unauthorized send

## Authenticated proof

```bash
OPS_ADMIN_TOKEN=… python3 scripts/daily-career-os-authenticated-e2e.py
```

Mint: `POST /api/v1/admin/pilot-os/daily-os/mint-synthetic-session` → synthetic `daily-os-synth+kpi@twin.internal` (kpi_excluded, not a real person).

## Tests

```bash
cd backend && python3 -m pytest tests/test_career_daily_os.py -q
```

## Production evidence (fill after deploy)

| Field | Value |
|-------|-------|
| `repo_head` | _(post-push)_ |
| `prod_frontend_commit` | _(public-health)_ |
| `prod_api_commit` | _(health)_ |
| `prod_worker_commit` | _(public-health worker_commit)_ |
| `alignment_status` | _(ALIGNED / residual)_ |
| `alembic_current` | `109_daily_career_os` |
| `authenticated_e2e` | _(script summary)_ |
| `smoke_ci` | _(GitHub Actions)_ |

## Stance (frozen)

Launch NO-GO · Enrollment OFF · Phase 3B BLOCKED · Phase 3 Agent NOT_STARTED · invite-only · invites 0 · synthetic ≠ real · no ALTEN · candidate-first PRIMARY
