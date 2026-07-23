# External Connector Operator Handoff

**Branch:** `cursor/phase1-monorepo-scaffold`  
**Last exhaustive audit:** 2026-07-23 (launch readiness handoff) @ tip `2418a9dba620f0320773bff0484487b458a497c6` (Slack still MISSING on API/worker)  
**Purpose:** Credentials Cursor cannot create after exhaustive audit.  
**Never paste secret values into tickets or chat. No fake secrets. No placeholders that look like real values.**

Stance unchanged: Pilot `BLOCKED_BY_FOUNDER` · Gate F `PENDING` · Launch `NO-GO` · Phase 3B `BLOCKED` · enrollment OFF.

`plat_slack_connector` remains **BLOCKED_EXTERNAL_CREDENTIALS** — code, tests, smoke harness, and this handoff are complete; only human operator action outside the repo is missing.

---

## Audit summary (re-verified 2026-07-23 continuation)

| Source | Slack result |
|--------|----------------|
| Railway `twin` (API) | all Slack keys **MISSING** |
| Railway `enthusiastic-encouragement` (worker) | all Slack keys **MISSING** |
| Vercel production env (CLI list) | no Slack-named vars — **MISSING** |
| GitHub Actions secrets (`gh secret list` + API names) | no Slack-named — **MISSING** |
| Local `.env` / `frontend/.env.local` / `backend/.env` / `.env.railway` | no `SLACK_*` / `TWIN_SLACK_*` keys |
| `.env.example` / `.env.railway.example` | names documented only (empty comments) |
| Malformed | none (keys absent, not bad URLs) |
| Stale | none |
| Inaccessible | none for Slack names this run (Vercel CLI accessible; listed) |

Aliases checked (code `_env`): `SLACK_CLIENT_ID`/`TWIN_SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`/`TWIN_SLACK_CLIENT_SECRET`, `SLACK_INCOMING_WEBHOOK_URL`/`TWIN_SLACK_WEBHOOK_URL`. Also scanned `SLACK_SIGNING_SECRET`, `SLACK_BOT_TOKEN`, `SLACK_APP_TOKEN`, `SLACK_WEBHOOK_URL` — all **MISSING**.

---

## Slack app setup

| Item | Operator action |
|------|-----------------|
| Create app | https://api.slack.com/apps → Create New App → From scratch |
| App type | Standard Slack app with **Incoming Webhooks** (minimum for WRITE). Optional OAuth install for CONFIGURATION/READ. |
| Scopes (minimal) | Incoming Webhooks feature **or** bot token scopes `chat:write`; add `channels:read` only if channel list READ is required |
| Redirect URI | `https://twin-production-bcd9.up.railway.app/api/v1/platform/wave5/connectors/slack/callback` (register only if using OAuth) |
| Event / webhook settings | Enable **Incoming Webhooks**; add webhook to test channel. Events API not required for current WRITE path |
| Signing secret | Optional for current incoming-webhook WRITE; store as `SLACK_SIGNING_SECRET` if Events API / request verification is enabled later |
| OAuth client ID | Basic Information → Client ID → `SLACK_CLIENT_ID` (or alias `TWIN_SLACK_CLIENT_ID`) |
| OAuth client secret | Client Secret → `SLACK_CLIENT_SECRET` (or alias `TWIN_SLACK_CLIENT_SECRET`) |
| Test workspace | Dedicated TWIN smoke / sandbox workspace — **not** customer workspaces |
| Test channel | e.g. `#twin-smoke` — **never** production customer channels |

---

## Environment variables

Exact names read by `backend/app/services/external_connectors.py`:

| Variable | Purpose | Railway API (`twin`) | Railway worker (`enthusiastic-encouragement`) | Vercel | GitHub Actions |
|----------|---------|----------------------|-----------------------------------------------|--------|----------------|
| `SLACK_INCOMING_WEBHOOK_URL` | WRITE delivery (primary) | **REQUIRED** for WRITE=LIVE | Set if worker posts (same value); else optional | **not needed** | **not needed** (smoke hits Railway) |
| `TWIN_SLACK_WEBHOOK_URL` | Alias for webhook | optional alias | optional alias | not needed | not needed |
| `SLACK_CLIENT_ID` | OAuth CONFIGURATION/READ | required for OAuth path | optional (API owns OAuth) | not needed | not needed |
| `TWIN_SLACK_CLIENT_ID` | Alias for client id | optional alias | optional | not needed | not needed |
| `SLACK_CLIENT_SECRET` | OAuth secret | required for OAuth path | optional | not needed | not needed |
| `TWIN_SLACK_CLIENT_SECRET` | Alias for client secret | optional alias | optional | not needed | not needed |
| `SLACK_SIGNING_SECRET` | Future Events API verify | optional | optional | not needed | not needed |
| `SLACK_BOT_TOKEN` | Bot path (not used by current webhook WRITE) | not required for webhook WRITE | not required | not needed | not needed |

**Minimum to clear WRITE block:** set `SLACK_INCOMING_WEBHOOK_URL` on Railway **`twin`**, redeploy, run smoke.

---

## Validation

| Step | Detail |
|------|--------|
| Status endpoint | `GET /api/v1/platform/wave5/connectors/status` (auth) → `slack.capabilities.WRITE=LIVE` when webhook HTTPS configured; `DRAFT`/`MONITORING` already LIVE without secrets |
| Smoke command | `cd frontend && TWIN_PROD_SMOKE_WRITE=1 npm run test:external-connector-prod-smoke` |
| Write flag | `TWIN_PROD_SMOKE_WRITE=1` required for delivery assertion |
| Auth | Metrics-excluded JWT via `TWIN_PROD_TEST_JWT` / `TWIN_ACCESS_TOKEN` — never log token |
| Expected | Slack delivery check PASS; no customer channel posts; harness reports connector status WRITE LIVE |
| Audit confirmation | `webhook_delivery_attempts` (or ledger via smoke) shows `slack.internal_test_post` attempt with success status |
| Cleanup | Revoke/rotate webhook in Slack app if temporary; optionally unset Railway vars to return WRITE to BLOCKED_EXTERNAL |
| Rollback | Unset Slack env on Railway → redeploy → status WRITE=`BLOCKED_EXTERNAL_CREDENTIALS`; revert registry promote if any |

After smoke PASS (Cursor): promote `plat_slack_connector` → `PASS` with smoke SHA/at; Hard LIVE guard; FE redeploy if registry in build; strict four-way.

---

## Security

| Control | Requirement |
|---------|-------------|
| Least privilege | Incoming webhook to `#twin-smoke` only; avoid broad bot scopes unless needed |
| Secret rotation | Rotate client secret + regenerate webhook if leaked or after temporary smoke |
| Token encryption | Do not store Slack secrets in git; Railway encrypted env only |
| Redirect URI allowlist | Only the production API callback URI above |
| OAuth state | Use server-issued state on connect (when OAuth path enabled); reject mismatch |
| Webhook signature | Prefer signing secret verification if Events API enabled; webhook URL is secret capability |
| Replay prevention | Smoke uses fingerprint/idempotency key on delivery ledger |
| Test workspace isolation | Never point prod webhook at customer channels; smoke payloads must not include PII |

---

## Cursor vs human gap

| Step | Cursor | Human |
|------|--------|-------|
| Exhaustive secret search | done — all MISSING | — |
| Create Slack app / webhook | cannot | **required** |
| Set Railway env | can apply values if provided out-of-band | provide values |
| Redeploy + smoke + registry promote | Cursor | — |
| Fake PASS without smoke | **forbidden** | — |

---

## Other connectors (unchanged summary)

| Connector | Notes |
|-----------|-------|
| Teams | Draft/config PASS; WRITE needs `TEAMS_INCOMING_WEBHOOK_URL` or Graph consent |
| Zapier | Generic signed webhook LIVE |
| Storage | Local LIVE; S3 keys optional |
| Google Calendar push | OAuth + public webhook present; per-user watch needs connected smoke account |

### Smoke (all connectors)

```bash
cd frontend
TWIN_PROD_SMOKE_WRITE=1 npm run test:external-connector-prod-smoke
```
