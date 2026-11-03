# Wave 5 Calendar & Integrations Complete — implementation

**Date:** 2026-07-22  
**Branch:** `feat/wave5-calendar-integrations-complete`  
**Alembic:** `091_integrations_wave5_hard_live`  
**Prior HEAD:** Wave 3 badges `bda5ad46` / code `e841dffc` / Alembic **090**  
**Wave 4:** **NOT SHIPPED** — no inventing; Wave 5 proceeds on Wave 3 scaffold HEAD.  
**Stance unchanged:** Pilot **BLOCKED_BY_FOUNDER** · Gate F **PENDING** · Launch **NO-GO** · enrollment **OFF**

## Capability-split rule

Never mark a whole integration **LIVE** because CONFIGURATION UI works. Statuses are per capability:

`CONFIGURATION | READ | IMPORT | EXPORT | DRAFT | WRITE | SYNC | WEBHOOK | MONITORING`

## Inventory (platform integrations)

| Bucket | Count | Notes |
|--------|------:|-------|
| Smokeable → Hard LIVE after auth smoke | 18 | Google honesty, ICS/WebCal, MS config honesty, ATS verify dry-run, email draft, prefs, OAuth status, CSV safe, inventory, webhook ledger |
| HELD_POLICY / NOT_BUILT | 12 | MS write, MS busy-read, ATS write/sync, Stripe public, Authologic auto KYC, Google push webhook, Slack/Teams/Zapier/cloud storage, ICS import |

## Surfaces shipped

| Surface | Route / API | Notes |
|---------|-------------|-------|
| Hard LIVE registry | `/api/v1/platform/wave5/*` | status + evidence + mark |
| Integration inventory | `GET .../integration-inventory` | per-capability statuses |
| Google/MS/ATS honesty | `GET .../{google,microsoft,ats}/honesty` | split statuses; smoke never writes providers |
| ICS preview / cancel | `POST .../ics/preview` | METHOD:CANCEL + STATUS + SEQUENCE + UID |
| WebCal mint | `POST .../webcal/mint` | metrics exclusion required |
| Email draft | `POST .../email/draft` | `send=true` → 400 |
| Webhook verify dry-run | `POST .../webhook/verify-dry-run` | HMAC + replay ledger; no ATS forward |
| CSV export safe | `POST .../csv/export-safe` | formula injection escape |
| Observability / security | `GET .../observability/metrics`, `.../security-review` | metrics names + review checklist |

## Flags (defaults)

`INTEGRATIONS_WAVE5_*` enabled for engineering paths; `ATS_LIVE_SYNC`, `MICROSOFT_CALENDAR_WRITE_ENABLED`, `STRIPE_PUBLIC_LAUNCH`, `EXTERNAL_PILOT_ENROLLMENT_ENABLED`, `AUTOLOGIC_AUTO_KYC` forced **false**.

## Smoke harness

```bash
TWIN_PROD_SMOKE_WRITE=1 WAVE5_SMOKE_MODULES=all npm run test:wave5-integrations-module-prod-smoke
```

Fail-closed without JWT / without metrics exclusion / on real provider write / real email / real calendar write / real ATS write → **FAIL**.

## Rollback

1. Flag off `INTEGRATIONS_WAVE5_*` live paths  
2. Prior Railway/Vercel deploy  
3. Alembic downgrade `091` only if safe (drops capability + webhook ledger tables)

## Explicit non-flips

No Wave 6 · No Founder Command · No Product Agent · No invites · No enrollment ON · No Stripe/ATS/MS write/auto-apply/Authologic flip · No LIVE badges until post-smoke PASS
