# External Connector Operator Handoff

**Branch:** `cursor/phase1-monorepo-scaffold`  
**Purpose:** Only credentials Cursor cannot create after exhaustive audit of repo, Railway, Vercel, GitHub secrets, `.env.example`, and provider docs.  
**Never paste secret values into tickets or chat.**

Stance unchanged: Pilot `BLOCKED_BY_FOUNDER` · Gate F `PENDING` · Launch `NO-GO` · Phase 3B `BLOCKED` · enrollment OFF.

---

## Audit summary (present / missing)

| Connector | Railway | Vercel | GitHub | Repo env.example | Recoverable by Cursor |
|-----------|---------|--------|--------|------------------|----------------------|
| Google Calendar OAuth client | present | n/a | n/a | documented | used |
| `GOOGLE_CALENDAR_PUSH_WEBHOOK_URL` | **set by this batch** | n/a | n/a | documented | done |
| Slack app (`SLACK_CLIENT_ID` / `SECRET`) | missing | missing | missing | documented | **no** |
| Slack incoming webhook | missing | missing | missing | documented | **no** |
| Microsoft OAuth (Teams connect) | present | n/a | n/a | documented | used for draft/connect honesty |
| `TEAMS_INCOMING_WEBHOOK_URL` | missing | missing | missing | documented | **no** |
| Graph Teams admin consent (channel list) | unknown / not granted | n/a | n/a | — | **no** |
| Zapier Marketplace | not required | — | — | generic webhook LIVE | done |
| S3 keys (`S3_ACCESS_KEY_ID` / `SECRET` / `BUCKET`) | only `S3_REGION` | missing | missing | documented | **no** (local LIVE) |
| Cloud vendor OAuth (Drive/OneDrive/Dropbox) | missing | missing | missing | — | **no** |

---

## 1. Slack — OAuth + delivery

| Field | Value |
|-------|--------|
| Provider | Slack API app + Incoming Webhooks |
| Missing | `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, optional signing secret; `SLACK_INCOMING_WEBHOOK_URL` |
| Where | Railway service **twin** (API + worker share env) |
| Redirect URI | `https://twin-production-bcd9.up.railway.app/api/v1/platform/wave5/connectors/slack/callback` *(add when OAuth routes ship)* |
| Scopes (minimal) | `incoming-webhook` or bot `chat:write` + `channels:read` for channel list |
| Validate | `GET /api/v1/platform/wave5/connectors/status` → `slack.capabilities.WRITE=LIVE` |
| Smoke | `TWIN_PROD_SMOKE_WRITE=1 npm run test:external-connector-prod-smoke` after webhook set; use **test channel only** |
| Rollback | Unset Slack vars; status returns draft LIVE / WRITE BLOCKED_EXTERNAL |
| Security | Never commit webhook URLs; rotate if leaked; no production customer channels for smoke |

**Checklist:** [ ] Create Slack app [ ] Install to test workspace [ ] Copy client id/secret to Railway [ ] Create incoming webhook to `#twin-smoke` [ ] Set `SLACK_INCOMING_WEBHOOK_URL` [ ] Redeploy [ ] Smoke [ ] Revoke webhook if temporary

---

## 2. Microsoft Teams — channel write / Graph read

| Field | Value |
|-------|--------|
| Provider | Microsoft 365 / Incoming Webhook **or** Graph `ChannelMessage.Send` |
| Missing for WRITE | `TEAMS_INCOMING_WEBHOOK_URL` **or** Graph application permission + admin consent |
| Present | `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_TENANT` (login/calendar OAuth) |
| Where | Railway **twin** |
| Admin consent | Azure Portal → App registration → API permissions → admin consent for Teams/Graph |
| Validate | `connectors/status` → `teams.capabilities.WRITE=LIVE`; READ may stay PARTIAL until consent |
| Smoke | Draft already covered; delivery only with test team channel |
| Rollback | Unset Teams webhook; WRITE returns BLOCKED_EXTERNAL |

**Checklist:** [ ] Decide Incoming Webhook vs Graph [ ] Create test team/channel [ ] Paste webhook URL **or** grant Graph + consent [ ] Smoke internal test post [ ] Confirm no customer tenant posts

---

## 3. S3-compatible cloud bucket (optional upgrade)

Local filesystem storage is **LIVE** on prod (`DATA_ROOM_LOCAL_UPLOAD_ENABLED=true`). Cloud keys remain optional.

| Field | Value |
|-------|--------|
| Provider | Cloudflare R2 / AWS S3 / MinIO |
| Missing | `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME`, optional `S3_ENDPOINT_URL` |
| Present | `S3_REGION` only |
| Where | Railway **twin** |
| Bucket policy | Block public access; CORS only `https://twin-sooty.vercel.app` / `https://gettwin.app` if browser PUT |
| Validate | `connectors/status` → `storage.backend=s3_compatible` |
| Smoke | `POST /api/v1/platform/wave5/connectors/storage/smoke` |
| Rollback | Clear S3 keys; local backend remains LIVE |
| Security | Least-privilege IAM; no public ACL; short presign TTL |

**Checklist:** [ ] Create private bucket [ ] Create access key [ ] Set four env vars on Railway [ ] Confirm `head_bucket` / smoke [ ] Disable public access

---

## 4. Google Calendar push — connected user watch (ops note)

OAuth client + public webhook URL are configured. Full `events.watch` against Google still needs a **connected user refresh token** on a metrics-excluded smoke account.

**Checklist:** [ ] Connect Google Calendar on smoke user [ ] `POST /api/v1/calendar/google/push/watch` [ ] Edit a calendar event [ ] Confirm webhook ack in ledger [ ] `stop` channel after test

---

## Smoke command

```bash
cd frontend
TWIN_PROD_SMOKE_WRITE=1 npm run test:external-connector-prod-smoke
```

JWT: metrics-excluded account (`TWIN_PROD_TEST_JWT` / `TWIN_ACCESS_TOKEN`). Never log the token.
