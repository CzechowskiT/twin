# TWIN Agent Dispatcher — Operations

## Endpoints

Base: `/api/internal/agent-dispatch`

| Method | Path | Scope | Notes |
|--------|------|-------|-------|
| GET | `/health` | none | Readiness; no secrets |
| GET | `/contract` | read | Cursor contract metadata + MCP readiness |
| POST | `/runs` | create | Create + optional immediate dispatch |
| GET | `/runs/{id}` | read | `?refresh=true` triggers poll |
| POST | `/runs/{id}/reconcile` | read | Force poll |
| POST | `/runs/{id}/cancel` | cancel | Cancel Cursor run + release lock |
| GET | `/runs/{id}/report` | read | Branch/PR/SHA/summary bundle |
| POST | `/admin/force-unlock` | admin | Force release lock (audited) |
| GET | `/canary` | admin | Read-only Cursor `/me` |
| POST | `/webhooks/cursor` | HMAC | Cursor statusChange |

## CLI (no API keys on argv)

From `frontend/`:

```bash
export TWIN_API_BASE_URL=https://<api-host>
export AGENT_DISPATCH_TOKEN=...   # from secret store — never paste into chat

npm run twin:agent:health
npm run twin:agent:canary
npm run twin:agent:dispatch -- --prompt-file ../prompts/batch.md
npm run twin:agent:status -- <runId> --refresh
npm run twin:agent:wait -- <runId>
npm run twin:agent:report -- <runId>
npm run twin:agent:cancel -- <runId>
```

## Production secrets (Railway)

| Name | Required | Purpose |
|------|----------|---------|
| `CURSOR_CLOUD_AGENTS_API_KEY` | for live Cursor | Service-account / API key (Dashboard → API Keys) |
| `AGENT_DISPATCH_TOKEN` | yes | Bearer for dispatcher API |
| `AGENT_DISPATCH_WEBHOOK_SECRET` | if webhooks | ≥32 chars; HMAC verify |
| `AGENT_DISPATCH_WEBHOOK_PUBLIC_URL` | if webhooks | Public HTTPS URL for Cursor callbacks |
| `AGENT_DISPATCH_GITHUB_TOKEN` | optional | PR/SHA/CI enrichment |
| `AGENT_DISPATCH_REPO_ALLOWLIST` | recommended | Comma-separated repo URLs |
| `AGENT_DISPATCH_BASE_BRANCH_ALLOWLIST` | recommended | Default: `cursor/phase1-monorepo-scaffold` |

If `CURSOR_CLOUD_AGENTS_API_KEY` is missing, canary returns **BLOCKED** with the exact founder instruction:

> add Cursor Cloud Agents service-account API credential to production secret store under documented name

## Celery

Beat entry `agent-dispatch-reconcile` every `AGENT_DISPATCH_POLL_INTERVAL_SECONDS` (default 60). Disable with `AGENT_DISPATCH_POLL_ENABLED=false`.

## Deploy checklist

1. Merge PR → scaffold branch (manual merge)
2. Railway API deploys → `alembic upgrade` applies `078_agent_dispatch`
3. Set secrets above
4. `GET /api/internal/agent-dispatch/health`
5. Admin canary (read-only)
6. Optional: dry-run create with `dispatch_now=false` then cancel

## Gate stance

Gate F = PENDING · Launch = NO-GO (unchanged by this batch).
