# Backup / restore drill log (gate O7)

Append-only evidence for `docs/RUNBOOK_DB_RESTORE_2026-05-27.md`.
**Do not** log prod-overwrite restores here without incident ID.

| Date (UTC) | Operator | Environment | Snapshot age | `alembic current` | Health check | Pass? | Notes |
| ---------- | -------- | ----------- | ------------ | ----------------- | -------------- | ----- | ----- |
| _pending_ | founder | staging clone | — | — | — | — | First drill not yet executed |

## Template (copy row)

```text
| 2026-MM-DD | name | staging clone from prod snapshot | 24h | 050_stripe_webhook_events (head) | GET …/health db_ok=true | ✅ | user count within 5% of prod ballpark |
```
