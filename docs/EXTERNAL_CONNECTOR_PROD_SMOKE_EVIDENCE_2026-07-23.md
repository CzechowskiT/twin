# External Connector Activation — prod smoke evidence

**Date:** 2026-07-23  
**Branch:** `cursor/phase1-monorepo-scaffold`  
**Implementation SHA:** `6317d1569120ed889ef136b250c98ba3bf5b5510`  
**Command:** `TWIN_PROD_SMOKE_WRITE=1 npm run test:external-connector-prod-smoke`  
**Result:** **6/6 PASS**

| # | Check | Result |
|---|--------|--------|
| 0 | Harness JWT present | PASS |
| 1 | Connectors status capability split | PASS |
| 2 | Google push READY + public webhook ack | PASS |
| 3 | Slack/Teams draft only (no external delivery) | PASS |
| 4 | Storage local roundtrip | PASS |
| 5 | Zapier subscribe → signed deliver → revoke | PASS |

**Promoted to PASS:** `plat_google_calendar_push_webhook`, `plat_teams_connector` (draft/config), `plat_zapier_connector`, `plat_cloud_storage_connectors`  
**Remains BLOCKED_EXTERNAL:** `plat_slack_connector` (see `docs/EXTERNAL_CONNECTOR_OPERATOR_HANDOFF.md`)  
**Stance unchanged:** Pilot BLOCKED · Gate F PENDING · Launch NO-GO · enrollment OFF
