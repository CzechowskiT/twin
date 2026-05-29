# Backup / restore drill log (gate O7)

Append-only evidence for `docs/RUNBOOK_DB_RESTORE_2026-05-27.md`.
**Do not** run or log prod-overwrite restores here without incident ID and explicit approval.

## Drill evidence table (append-only)

| Date (UTC) | Operator | Backup source | Target env | Result | Restore time | Errors | Screenshot/evidence | GO/NO-GO decision | Notes |
| ---------- | -------- | ------------- | ---------- | ------ | ------------ | ------ | ------------------- | ----------------- | ----- |
| _pending_ | founder | latest prod snapshot | staging clone | PENDING | — | — | attach restore target screenshot + health output + `alembic current` + SQL sanity query | NO-GO | First drill not yet executed — use founder checklist below |
| 2026-05-29 | agent | — | — | PENDING | — | — | Runbook reviewed; no staging restore executed (HARD BAN: no prod DB touch) | NO-GO | O7 remains open until founder staging drill row with PASS |
| 2026-05-29 | O7 drill operator (agent) | Railway Postgres daily snapshot (prod source, **not** restored over prod) | staging clone `twin-staging-restore-proof-YYYYMMDD` (expected) | **PENDING EVIDENCE** | — | none (drill not executed) | No Railway staging creds in agent session; prod health read-only OK (`db_ok=true`, SHA `df15618`) | **NO-GO** | Prepared evidence path + PASS criteria in runbook; **founder must execute** steps 1–8 in `RUNBOOK_DB_RESTORE_2026-05-27.md` |
| 2026-05-29 | release gate agent (batch 2) | — | — | **PENDING EVIDENCE** | — | none | Re-confirmed: no staging Railway access; prod untouched; runbook + founder checklist complete | **NO-GO** | O7 unchanged — restore drill requires founder credentials |

## O7 PASS criteria (summary)

All must be true before flipping O7 to ✅ in the launch checklist:

1. Backup source + snapshot timestamp (no secrets).
2. Restore target is a **new staging clone** — not production.
3. Drill UTC date, operator name, measured restore time.
4. RPO (snapshot age) and RTO (restore duration) noted.
5. Post-restore staging health: `db_ok=true`.
6. Read-only checks: `alembic current` or `alembic_version` + one row count.
7. Cleanup note if staging `DATABASE_URL` was temporarily repointed.
8. Evidence attached (screenshot + outputs, redacted).
9. Explicit GO/NO-GO; only **GO** on a **PASS** row closes O7.
10. **No prod DB mutation** during the drill.

Full table: `docs/RUNBOOK_DB_RESTORE_2026-05-27.md` § O7 PASS criteria.

## O7 quick references

- Runbook: `docs/RUNBOOK_DB_RESTORE_2026-05-27.md`
- Gate context: `docs/PUBLIC_LAUNCH_GATE_CHECKLIST_2026-05-27.md` (O7)
- Read-only prod health (baseline only — **not** restore evidence): `https://twin-sooty.vercel.app/api/public-health`
- Minimum evidence pack for each **PASS** row:
  1. Railway restore job screenshot (source + target + timestamp),
  2. post-restore **staging** health response payload,
  3. `alembic current` or SQL `alembic_version` output,
  4. one SQL sanity query output (e.g. `SELECT COUNT(*) FROM users;`),
  5. gate decision (`GO`/`NO-GO`) with operator note.

## Founder template (copy one row per drill)

```text
| 2026-MM-DD | founder-name | Railway Postgres backup #12345 | staging clone | PASS | 00:27:30 | none | screenshot link + /health output + SQL result | GO | alembic revision matched expected head; smoke passed |
```

## Founder action checklist (closes O7 — ~30–45 min)

Execute in Railway Dashboard; agent cannot run this without founder credentials.

| Step | Action | PASS signal |
| ---- | ------ | ----------- |
| 1 | Postgres → Backups → confirm daily snapshots enabled | Screenshot: backups ON |
| 2 | **Restore to new database** (latest snapshot) | Target name ≠ production service |
| 3 | Name clone `twin-staging-restore-proof-YYYYMMDD` | Screenshot: clone created |
| 4 | Point **staging API only** at clone `DATABASE_URL` | Never edit production API vars |
| 5 | Staging shell: `alembic current` | Output shows expected head (e.g. `050_stripe_webhook_events`) |
| 6 | Staging health GET | `status=ok`, `db_ok=true` |
| 7 | Read-only SQL: `SELECT version_num FROM alembic_version;` + `SELECT COUNT(*) FROM users;` | Both return without error |
| 8 | Append **PASS** row below with evidence | GO decision |
| 9 | Revert staging API to normal DB if needed | Note in cleanup column |

**Blockers if skipped:** No staging Railway access → O7 stays PENDING; public launch stays NO-GO.

## Non-technical founder quick steps

1. Restore latest snapshot to a **new staging clone** (never overwrite prod).
2. Verify staging API health is green.
3. Verify migration revision with `alembic current` (or SQL `alembic_version`).
4. Add one line in this table with evidence links or pasted outputs.
5. Keep O7 as **NO-GO** until one **PASS** row exists meeting all O7 PASS criteria.
