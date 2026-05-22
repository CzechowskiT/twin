# Nightly auto-apply — deploy checklist (agent runbook)

Merged to `cursor/phase1-monorepo-scaffold` (commits through `9933fd3`).

## After merge (one-time)

```bash
# 1. Railway API vars (eager off + Redis broker)
./scripts/copy-railway-vars-to-clipboard.sh   # Raw Editor → twin → Deploy

# Or with linked CLI / RAILWAY_TOKEN in .env.railway:
./scripts/railway-apply-production-env.sh
./scripts/railway-apply-worker-env.sh

# 2. DB migration 037
./scripts/railway-alembic-upgrade.sh   # needs: railway link OR RAILWAY_TOKEN + project

# 3. Smoke
./scripts/verify-prod-health.sh
curl -sS "$API/api/v1/health/celery-status" | python3 -m json.tool
```

## Investor demo (works before beat)

1. `/dashboard/settings/auto-apply` — consent + enable
2. **Run now** with Pracuj.pl match ≥ threshold
3. Dashboard strip shows next run label

## Status (2026-05-19)

| Item | Status |
|------|--------|
| Code on scaffold | Done (`9933fd3` + header `6ed830e`) |
| `/health/celery-status` | Done |
| Integration tests (mock apply) | Done — `backend/tests/test_nightly_auto_apply_integration.py` |
| Dashboard strip | Done — `NightlyAutoApplyStrip` on `/dashboard` |
| `DEPLOYMENT.sh` / `ERRORS.md` | Done (root) |
| Prod env (`CELERY_TASK_ALWAYS_EAGER=false`, ops tokens) | Done via `railway link` + `railway-apply-production-env.sh` |
| Migration 037 | Runs on API deploy (`start-api.sh`); verify with consent/settings API |
| Worker + beat | Service `enthusiastic-encouragement` — keep `CELERY_BROKER_URL=${{Redis.REDIS_URL}}` |
| GitHub PR via `gh` | Optional — merge/push to `cursor/phase1-monorepo-scaffold` |
| Load test 100 users | Not in MVP scope |

## Remaining from mega-prompt (`cursor_autonomous_nightly_autoapply.md`)

Source checklist lives in Downloads; code path is **`app.services.nightly_auto_apply`** + **`/dashboard/settings/auto-apply`**.

### Prod verification (do once after env green)

**Morning verification:** after 02:00 Europe/Warsaw, run `./scripts/verify-prod-health.sh` and `GET /api/v1/health/celery-status` (`beat_schedule_has_nightly: true`); confirm worker logs show `nightly_auto_apply_sweep` and a new `auto_apply_runs` row for the night.

**Agent log (2026-05-22 ~13:55 CEST):** prod already shows `beat_schedule_has_nightly: true`, `worker_active: true`, `celery_task_always_eager: false`. The 02:00 Europe/Warsaw sweep cannot be confirmed until **2026-05-23 morning** — check Railway worker logs for `nightly_auto_apply_sweep`, `GET /api/v1/ops/auto-apply/last-run` (Bearer `OPS_ADMIN_TOKEN`), and a new `auto_apply_runs` row for the night.

- [ ] `./scripts/verify-prod-health.sh` → `worker_active: true`, `celery_task_always_eager: false`
- [ ] `GET /api/v1/health/celery-status` on Railway API
- [ ] Enable consent on prod → **Run now** → strip shows `last_run_at` + count
- [ ] After **02:00 Europe/Warsaw**: Railway worker logs show `nightly_auto_apply_sweep`
- [ ] DB: `auto_apply_runs` row for that night; `applications` with auto-apply source
- [ ] Users with submissions > 0 receive `send_nightly_auto_apply_summary_email` (mail env set)

### Investor demo script (from prompt)

1. `/dashboard/settings/auto-apply` — consent modal, enable
2. Show **Next run: Tonight at 2 AM** (or `next_run_label` from API)
3. Dashboard `NightlyAutoApplyStrip` — stats even if 0
4. Do **not** promise all boards (Pracuj.pl only) or guaranteed interviews

### Not blocking MVP

- Branch name `feature/nightly-auto-apply` (shipped on `cursor/phase1-monorepo-scaffold` instead)
- Load test 100 concurrent users
- Autonomous `gh pr` / force-push rollback paths in prompt

### Related product slices (same north star, separate branches)

| Slice | Status |
|-------|--------|
| Referrals UI `/dashboard/referrals` | Branch `cursor/referrals-ats-dataroom-personas` — merge + deploy |
| ATS setup UI `/recruiter/integrations/ats` | Same branch |
| Investor data room `/investor/data-room` | Same branch (traction pack; confidential via `/contact`) |
| ATS OAuth two-way job sync | Backlog — webhooks only |
| Full data room (NDA, uploads, audit log) | Backlog |

See also **`docs/NEXT_10_STEPS.md`** and **`docs/USER_STORIES_STATUS.md`**.
