# Backup / restore drill log (gate O7)

Append-only evidence for `docs/RUNBOOK_DB_RESTORE_2026-05-27.md`.
**Do not** run or log prod-overwrite restores here without incident ID and explicit approval.

## Drill evidence table

| Date (UTC) | Operator | Backup source | Target env | Result | Restore time | Errors | Screenshot/evidence | GO/NO-GO decision | Notes |
| ---------- | -------- | ------------- | ---------- | ------ | ------------ | ------ | ------------------- | ----------------- | ----- |
| _pending_ | founder | latest prod snapshot | staging clone | PENDING | — | — | attach UI screenshot + health output | NO-GO | First drill not yet executed |

## Founder template (copy one row per drill)

```text
| 2026-MM-DD | founder-name | Railway Postgres backup #12345 | staging clone | PASS | 00:27:30 | none | screenshot link + /health output + SQL result | GO | alembic revision matched expected head; smoke passed |
```
