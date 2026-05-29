# Backup / restore drill log (gate O7)

Append-only evidence for `docs/RUNBOOK_DB_RESTORE_2026-05-27.md`.
**Do not** run or log prod-overwrite restores here without incident ID and explicit approval.

## Drill evidence table (append-only)

| Date (UTC) | Operator | Backup source | Target env | Result | Restore time | Errors | Screenshot/evidence | GO/NO-GO decision | Notes |
| ---------- | -------- | ------------- | ---------- | ------ | ------------ | ------ | ------------------- | ----------------- | ----- |
| _pending_ | founder | latest prod snapshot | staging clone | PENDING | — | — | attach restore target screenshot + health output + `alembic current` + SQL sanity query | NO-GO | First drill not yet executed |
| 2026-05-29 | agent | — | — | PENDING | — | — | Runbook reviewed; no staging restore executed (HARD BAN: no prod DB touch) | NO-GO | O7 remains open until founder staging drill row with PASS |

## O7 quick references

- Runbook: `docs/RUNBOOK_DB_RESTORE_2026-05-27.md`
- Gate context: `docs/PUBLIC_LAUNCH_GATE_CHECKLIST_2026-05-27.md` (O7)
- Read-only health check URL: `https://twin-sooty.vercel.app/api/public-health`
- Minimum evidence pack for each row:
  1. Railway restore job screenshot (source + target + timestamp),
  2. post-restore health response payload,
  3. one SQL sanity query output,
  4. gate decision (`GO`/`NO-GO`) with operator note.

## Founder template (copy one row per drill)

```text
| 2026-MM-DD | founder-name | Railway Postgres backup #12345 | staging clone | PASS | 00:27:30 | none | screenshot link + /health output + SQL result | GO | alembic revision matched expected head; smoke passed |
```

## Non-technical founder quick steps

1. Restore latest snapshot to a **new staging clone** (never overwrite prod).
2. Verify staging API health is green.
3. Verify migration revision with `alembic current` (or SQL `alembic_version`).
4. Add one line in this table with evidence links or pasted outputs.
5. Keep O7 as **NO-GO** until one PASS row exists.
