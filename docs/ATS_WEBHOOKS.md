# ATS webhooks (B2B placement signals)

Inbound webhooks let employers confirm hires inside their ATS — aligned with [`PLACEMENT_VERIFICATION.md`](./PLACEMENT_VERIFICATION.md) layer 2.

## Greenhouse (implemented)

**Endpoint:** `POST /api/v1/integrations/ats/greenhouse`

**Env:** `GREENHOUSE_WEBHOOK_SECRET` — HMAC-SHA256 over raw body (`X-Greenhouse-Signature` or `X-Hub-Signature-256`).

**Behaviour:** On hire-style events, matches `applications.external_ats_id` + `external_ats_provider=greenhouse`, sets status `hired`, and marks `placement_state=verified` with audit event `placement.ats_hire_confirmed`.

**Setup:**

1. Store Greenhouse application id on TWIN `Application` when auto-apply or manual sync sets `external_ats_id`.
2. Register webhook URL in Greenhouse to your Railway API host.
3. Set secret on API service and redeploy.

## Lever (implemented)

**Endpoint:** `POST /api/v1/integrations/ats/lever`

**Env:** `LEVER_WEBHOOK_SECRET` — HMAC-SHA256 hex digest of raw body in header `X-Lever-Signature`.

Hire-style events with `applicationId` match `external_ats_provider=lever` and mark placement verified (same as Greenhouse).

## Ashby (implemented)

**Endpoint:** `POST /api/v1/integrations/ats/ashby`

**Env:** `ASHBY_WEBHOOK_SECRET` — header `Ashby-Signature: sha256=<hex>` (HMAC-SHA256 of raw body).

Hire-style `eventName` with `data.application.id` matches `external_ats_provider=ashby`.

## Outbound employer webhook

When auto-apply succeeds, optional `POST` to `EMPLOYER_WEBHOOK_URL` with HMAC `EMPLOYER_WEBHOOK_SECRET` — see `app/services/employer_webhook.py`.
