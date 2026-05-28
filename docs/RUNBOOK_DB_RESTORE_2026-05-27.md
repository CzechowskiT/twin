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

## Restore drill (staging proof for founder, no production overwrite)

1. In Railway Postgres Backups, pick the latest snapshot and choose **Restore to new database**.
2. Name target clearly (example: `twin-staging-restore-proof-YYYYMMDD`) and confirm target is **not** production.
3. Connect staging API service to the new clone `DATABASE_URL` only (never touch production service variables).
4. In staging API shell run `alembic current`; copy output for evidence.
5. Check health endpoint for staging service (`/api/v1/health` or `/api/public-health` if proxied) and save response.
6. Run one SQL sanity query (`SELECT version_num FROM alembic_version;` plus one count like `SELECT COUNT(*) FROM users;`).
7. **Log result** in `docs/BACKUP_RESTORE_DRILL_LOG.md` with PASS/FAIL and evidence artifacts.
8. Return staging API env to previous non-restore DB after proof if needed.

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

## Founder-safe evidence checklist (must attach)

- Screenshot of Railway restore target showing a **new clone** (not prod).
- `alembic current` output or SQL `SELECT version_num FROM alembic_version;`.
- Health response showing API started and DB reachable.
- One row-count sanity query output.
- Explicit GO/NO-GO decision and next action.

## Hard bans honoured

- No prod restore executed in agent sessions
- No prod DB migration
