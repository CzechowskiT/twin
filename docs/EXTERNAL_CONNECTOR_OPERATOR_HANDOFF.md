# External Connector Operator Handoff

**Branch:** `cursor/phase1-monorepo-scaffold`  
**Last exhaustive audit:** 2026-07-23 @ SHA `8bc25388e76cccd14c61826079d37fdc65fb8132`  
**Purpose:** Only credentials Cursor cannot create after exhaustive audit of repo, Railway (API + worker), Vercel, GitHub secrets, `.env.example`, aliases, and provider docs.  
**Never paste secret values into tickets or chat.**

Stance unchanged: Pilot `BLOCKED_BY_FOUNDER` · Gate F `PENDING` · Launch `NO-GO` · Phase 3B `BLOCKED` · enrollment OFF.

---

## Audit summary (present / missing) — 2026-07-23 re-audit

| Connector | Railway `twin` (API) | Railway `enthusiastic-encouragement` | Vercel | GitHub Actions secrets | Repo `.env*.example` / local `.env*` | Recoverable by Cursor |
|-----------|----------------------|--------------------------------------|--------|------------------------|--------------------------------------|----------------------|
| Google Calendar OAuth client | present | n/a | n/a | n/a | documented | used |
| `GOOGLE_CALENDAR_PUSH_WEBHOOK_URL` | present | n/a | n/a | n/a | documented | done |
| Slack app (`SLACK_CLIENT_ID` / `SECRET`) | **MISSING** | **MISSING** | **MISSING** (CLI not linked; no Slack-named vars in prior audits) | **MISSING** | documented (empty placeholders only) | **no** |
| Slack aliases (`TWIN_SLACK_*`) | **MISSING** | **MISSING** | **MISSING** | **MISSING** | code accepts aliases | **no** |
| `SLACK_SIGNING_SECRET` / `SLACK_BOT_TOKEN` | **MISSING** | **MISSING** | **MISSING** | **MISSING** | not required for incoming-webhook path | **no** |
| Slack incoming webhook | **MISSING** | **MISSING** | **MISSING** | **MISSING** | documented | **no** |
| Microsoft OAuth (Teams connect) | present | n/a | n/a | n/a | documented | used for draft/connect honesty |
| `TEAMS_INCOMING_WEBHOOK_URL` | missing | missing | missing | missing | documented | **no** (WRITE stays optional; draft PASS) |
| Zapier Marketplace | not required | — | — | — | generic webhook LIVE | done |
| S3 keys | only `S3_REGION` | — | missing | missing | documented | **no** (local LIVE) |

**Local files checked (keys only, values never logged):** `.env`, `frontend/.env.local`, `backend/.env`, `.env.railway` — **no** `SLACK_*` / `TWIN_SLACK_*` keys present.

**Malformed / stale:** none found (all Slack keys absent, not placeholder-filled).

**Inaccessible:** Vercel CLI not installed in operator shell this run; GitHub repo secrets listed via `gh secret list` + Actions secrets API — no Slack-named entries. No evidence of Slack credentials elsewhere in recoverable Cursor surface.

---

## 1. Slack — OAuth + delivery (sole BLOCKED_EXTERNAL)

| Field | Value |
|-------|--------|
| Provider | Slack API app + Incoming Webhooks |
| Module | `plat_slack_connector` — status **BLOCKED_EXTERNAL_CREDENTIALS** |
| Missing | `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`; delivery: `SLACK_INCOMING_WEBHOOK_URL` (aliases `TWIN_SLACK_CLIENT_ID` / `TWIN_SLACK_CLIENT_SECRET` / `TWIN_SLACK_WEBHOOK_URL` also accepted by code) |
| Optional | `SLACK_SIGNING_SECRET` (request verification if Events API added later); `SLACK_BOT_TOKEN` (bot path — not required if incoming webhook used) |
| Where | Railway service **`twin`** (API). Worker service **`enthusiastic-encouragement`** shares connector write path only if it reads same env — set on **both** if worker posts; minimum is **`twin`**. |
| Not needed on | Vercel frontend (server-side connector status is API); GitHub Actions (prod smoke uses Railway runtime) |
| Redirect URI | `https://twin-production-bcd9.up.railway.app/api/v1/platform/wave5/connectors/slack/callback` *(register when using OAuth install flow)* |
| Scopes (minimal) | Incoming Webhooks **or** bot `chat:write` (+ `channels:read` only if channel list required) |
| Test workspace only | Create dedicated Slack workspace or `#twin-smoke` channel — **never** customer production channels |
| Validate (read) | `GET /api/v1/platform/wave5/connectors/status` → `slack.capabilities.WRITE=LIVE` (after env + redeploy) |
| Smoke (write) | `cd frontend && TWIN_PROD_SMOKE_WRITE=1 npm run test:external-connector-prod-smoke` with metrics-excluded JWT — expect Slack delivery check PASS |
| Promote | After smoke PASS: update Hard LIVE registry + TS map for `plat_slack_connector` → `PASS` with smoke SHA/timestamp; Hard LIVE guard; redeploy FE if registry in build; strict four-way |
| Rollback | Unset Slack vars on Railway; status returns draft LIVE / WRITE BLOCKED_EXTERNAL; revert registry if promoted |
| Security | Never commit webhook URLs or client secrets; rotate if leaked; revoke temporary webhook after smoke; no PII in smoke payloads |

### Operator checklist (human)

1. [ ] Create Slack app at https://api.slack.com/apps (test workspace)
2. [ ] Enable Incoming Webhooks → add to `#twin-smoke` (or equivalent test channel)
3. [ ] Copy webhook URL → set `SLACK_INCOMING_WEBHOOK_URL` on Railway **`twin`** (and worker if applicable)
4. [ ] (Optional OAuth) set `SLACK_CLIENT_ID` + `SLACK_CLIENT_SECRET`; add redirect URI above
5. [ ] Redeploy Railway `twin` (and worker if env changed there)
6. [ ] Notify Cursor / run smoke with `TWIN_PROD_SMOKE_WRITE=1`
7. [ ] Confirm registry promote + alignment
8. [ ] Rotate/revoke webhook if it was temporary

---

## 2. Microsoft Teams — channel write / Graph read

| Field | Value |
|-------|--------|
| Provider | Microsoft 365 / Incoming Webhook **or** Graph `ChannelMessage.Send` |
| Missing for WRITE | `TEAMS_INCOMING_WEBHOOK_URL` **or** Graph application permission + admin consent |
| Present | `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_TENANT` (login/calendar OAuth) |
| Module status | `plat_teams_connector` = **PASS** (CONFIGURATION/DRAFT honesty); channel WRITE may remain capability-split BLOCKED until webhook/consent |
| Where | Railway **twin** |
| Validate | `connectors/status` → teams draft LIVE; WRITE LIVE only with webhook/consent |
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

## Cursor vs human gap (Slack)

| Step | Cursor | Human / Founder |
|------|--------|-----------------|
| Exhaustive secret search | done — all missing | — |
| Create Slack app / webhook | **cannot** | required |
| Set Railway env | can set **if** values provided out-of-band | provide values |
| Redeploy + smoke + registry | Cursor | — |
| Promote PASS without smoke | **forbidden** | — |
