# Prelaunch backup, restore & DR audit — 2026-07-13

> **Gate:** O7 · **Prior log:** [BACKUP_RESTORE_DRILL_LOG.md](./BACKUP_RESTORE_DRILL_LOG.md)

---

## Summary

| Item | Status |
|------|--------|
| Prod `db_ok` | ✅ `true` @ 2026-07-13 batch |
| Last O7 PASS | 2026-06-01 (pg_dump → staging clone) |
| Post-scaffold re-drill | **PENDING** |
| INC-DB-2026-05-29-001 | RESOLVED |
| Automatic downgrade on prod | **BANNED** |

---

## Production baseline (read-only)

```
GET https://twin-sooty.vercel.app/api/public-health
git_commit: ae14bfb58fc0c2db56a6fa0f417ca41c534b7960
db_ok: true
```

**Note:** Post-merge alignment batch 2026-07-13 — API+FE aligned @ `ae14bfb5`; Alembic upgraded to head `077` on deploy (logs: deployment `ead5b0a0`).

---

## O7 drill history

| Date | Result | Notes |
|------|--------|-------|
| 2026-05-29 | FAIL (incident) | Wrong volume mount — recovered same day |
| 2026-06-01 | **PASS** | pg_dump prod → staging clone; counts matched |
| 2026-06-11 | NOT DONE | Post-audit re-drill required after redeploy |
| 2026-07-13 | **MAX REHEARSAL** | Synthetic PASS | `sim:integration-070-077:dry-run` + `test:rollback-engine-v2` + O7 runbook current; real pg_dump **BLOCKED** (no founder Railway creds) |

---

## RPO / RTO (documented targets)

| Metric | Target | Evidence |
|--------|--------|----------|
| RPO | Daily Railway snapshots | Dashboard backups ON |
| RTO | < 4h (founder estimate) | Runbook `RUNBOOK_DB_RESTORE_2026-05-27.md` |
| Measured restore (2026-06-01) | Not timed in log | PASS row exists |

---

## Release train rollback stance

| Scenario | Action |
|----------|--------|
| Failed migration on deploy | **STOP** deploy; do not `alembic downgrade` on prod |
| Data corruption | Railway backup restore per incident runbook |
| Bad FE deploy | Vercel instant rollback to prior deployment |
| Failed wave merge | Keep PR OPEN; re-run `sim:integration-070-077` |

Tooling: `npm run test:rollback-engine-v2` · `docs/ROLLBACK_DECISION_PR448_449_450_2026-07-13.md`

---

## DR gaps (launch blockers)

| ID | Gap | Severity |
|----|-----|----------|
| LB-201 | O7 re-drill after scaffold `070`+ train migrations | P1 |
| — | No automated cross-region failover | Accepted (Railway single region) |
| — | Backup restore not tested for revision `077` chain | P1 post-merge |

---

## Founder action (closes O7 re-drill)

Execute `docs/O7_RESTORE_DRILL_RUNBOOK_2026-06-11.md` on staging clone after next prod migration deploy.

**DR verdict:** **Pilot-acceptable** with 2026-06-01 evidence; **re-drill required** before public GO after train merge.
