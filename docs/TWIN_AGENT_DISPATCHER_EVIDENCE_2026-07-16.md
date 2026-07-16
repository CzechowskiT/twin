# TWIN Agent Dispatcher — Evidence 2026-07-16

## SoT audit

| Item | Result |
|------|--------|
| Scaffold branch | `cursor/phase1-monorepo-scaffold` |
| Feature branch | `feat/twin-agent-dispatcher` |
| Prior agent-dispatch code | Initial commit on branch; policy hardening in follow-up |
| Internal auth precedent | Bearer ops/partner + HMAC webhooks |
| Celery/Redis | Existing beat + worker |
| Encryption | `token_crypto` Fernet |
| GitHub PR/CI client | Dispatcher enricher |

## Cursor API contract (official docs fetched 2026-07-16)

| Field | Value |
|------|-------|
| Base URL | `https://api.cursor.com` |
| Auth | Basic (API key username) or Bearer |
| Create | `POST /v1/agents` (primary); `POST /v0/agents` when webhook URL set |
| Get run | `GET /v1/agents/{id}/runs/{runId}` or `GET /v0/agents/{id}` |
| Cancel | `POST /v1/agents/{id}/runs/{runId}/cancel` or `POST /v0/agents/{id}/stop` |
| Webhooks | Documented for v0; v1 “coming soon” |
| Signature | `X-Webhook-Signature: sha256=<hex>` HMAC-SHA256 raw body |
| Run statuses (v1) | CREATING, RUNNING, FINISHED, ERROR, CANCELLED, EXPIRED |
| Contract version stamped | `v1-public-beta+v0-webhooks` |

Sources:

- https://cursor.com/docs/cloud-agent/api/endpoints
- https://cursor.com/docs/cloud-agent/api/v0
- https://cursor.com/docs/cloud-agent/api/webhooks
- https://cursor.com/docs/api

## Policy hardening (same day)

- Scopes renamed to `agent_runs:*`
- Create requires `task_name` + `execution_policy` (all hard-true)
- `auto_create_pr` default `false`
- Force-unlock returns 403 (`no_admin_override`)
- Prompt TTL enforced + Celery purge
- Startup recover enqueued from API lifespan
- Migration `079_agent_dispatch_policy`
- Docs published as `docs/TWIN_AGENT_DISPATCHER_*.md`

## Tests

```
pytest backend/tests/test_agent_dispatch.py \
       backend/tests/test_alembic_single_head.py \
       backend/tests/test_app_import_boot.py
```

## Canary

`CURSOR_CLOUD_AGENTS_API_KEY` not present in Railway at evidence time → live canary **BLOCKED** (credential only).

Founder action (exact):

> Create one Cursor Cloud Agents service-account credential authorized for CzechowskiT/twin and store it in the existing Railway production secret store as CURSOR_CLOUD_AGENTS_API_KEY.

## Hosted MCP batch (follow-up)

- Hosted MCP JSON-RPC at `/api/internal/agent-dispatch/mcp`
- Tools: dispatch/status/report/handoff/cancel/list/reconcile
- ChatGPT setup: `docs/TWIN_AGENT_DISPATCHER_CHATGPT_SETUP.md`
- `AGENT_DISPATCH_TOKEN` + webhook secret set in Railway (values never in repo)

## Secret scan

No API keys committed. Credential name documented: `CURSOR_CLOUD_AGENTS_API_KEY`.

## Gate stance

Gate F = PENDING · Launch = NO-GO
