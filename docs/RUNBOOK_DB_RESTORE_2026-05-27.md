# O7 — Postgres backup and restore runbook — 2026-05-27

**Gate:** O7 in `docs/PUBLIC_LAUNCH_GATE_CHECKLIST_2026-05-27.md`
**Status:** Documented procedure; **last restore drill not yet logged** → gate remains ❌.

## Railway Postgres (production)

1. **Snapshots:** Railway Dashboard → Postgres service → Backups (verify daily snapshots enabled).
2. **Point-in-time:** Note Railway plan limits; document RPO/RTO targets below.

| Metric | Target today | Evidence |
| ------ | ------------ | -------- |
| RPO | ≤ 24h (daily snapshot) | Dashboard screenshot in ops log |
| RTO | ≤ 2h manual restore | Drill log entry required |

## Restore drill (staging or isolated clone — never prod without approval)

1. Create a **new** Railway Postgres instance from latest snapshot (do not overwrite prod).
2. Point a **staging** API service at the clone `DATABASE_URL`.
3. Run `alembic current` — must match prod revision.
4. Run `./scripts/verify-prod-health.sh` against staging API (adapt URL).
5. Spot-check: `SELECT COUNT(*) FROM users;` vs known ballpark.
6. **Log result** in `docs/BACKUP_RESTORE_DRILL_LOG.md` (create entry with date, operator, pass/fail).

## Production restore (incident only)

See `docs/INCIDENT_RESPONSE_RUNBOOK_2026-05-27.md` § database outage.

1. Pause API + worker (prevent writes during restore).
2. Restore snapshot to new Postgres or rollback service.
3. Verify `alembic current`.
4. Resume traffic; run smoke + public-health.

## What closes gate O7

- [ ] Daily backup confirmed in Railway UI
- [ ] One successful restore drill logged (staging clone)
- [ ] RPO/RTO row filled in this doc with actual drill timestamps

## Hard bans honoured

- No prod restore executed in agent sessions
- No prod DB migration
