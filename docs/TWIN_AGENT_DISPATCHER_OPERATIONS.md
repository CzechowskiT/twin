# TWIN Agent Dispatcher — Operations

## Endpoints

Base: `/api/internal/agent-dispatch`

| Method | Path | Scope | Purpose |
|--------|------|-------|---------|
| GET | `/health` | none | Readiness (no secrets) |
| GET | `/contract` | `agent_runs:read` | Cursor contract + MCP flag |
| POST | `/runs` | `agent_runs:create` | Create dispatch run |
| GET | `/runs/{id}` | `agent_runs:read` | Status (`?refresh=true` polls Cursor) |
| POST | `/runs/{id}/reconcile` | `agent_runs:read` | Force poll + enrich |
| GET | `/runs/{id}/report` | `agent_runs:read` | Final report slice |
| POST | `/runs/{id}/cancel` | `agent_runs:cancel` | Cancel + release lock |
| POST | `/webhooks/cursor` | HMAC | Cursor statusChange |
| GET | `/canary` | `agent_runs:admin` | Read-only `/me` probe |
| POST | `/admin/force-unlock` | — | **403** (`no_admin_override`) |

## CLI

From `frontend/`:

```bash
export AGENT_DISPATCH_TOKEN=...   # from secret store — never paste into chat
export TWIN_API_BASE_URL=https://api.twinapp.ai   # or local

npm run twin:agent:dispatch -- --prompt-file ../prompts/batch.md --task-name my-batch
npm run twin:agent:status -- <runId> --refresh
npm run twin:agent:wait -- <runId>
npm run twin:agent:cancel -- <runId>
npm run twin:agent:report -- <runId>
npm run twin:agent:canary
npm run twin:agent:health
```

Optional: `--create-pr` to ask Cursor to open a PR (manual merge still required). Default is no PR.

## Secrets (production store)

| Name | Required | Purpose |
|------|----------|---------|
| `CURSOR_CLOUD_AGENTS_API_KEY` | for live Cursor | Service-account / API key (Dashboard → API Keys) |
| `AGENT_DISPATCH_TOKEN` | yes | Bearer for dispatcher API |
| `AGENT_DISPATCH_TOKENS` | optional | Multi-token `tok:agent_runs:create\|agent_runs:read,...` |
| `AGENT_DISPATCH_WEBHOOK_SECRET` | if webhooks | ≥32 chars; HMAC verify |
| `AGENT_DISPATCH_WEBHOOK_PUBLIC_URL` | if webhooks | Public HTTPS URL for Cursor callbacks |
| `AGENT_DISPATCH_GITHUB_TOKEN` | optional | PR/SHA/CI enrichment |
| `AGENT_DISPATCH_REPO_ALLOWLIST` | recommended | Default: `https://github.com/CzechowskiT/twin` |
| `AGENT_DISPATCH_BASE_BRANCH_ALLOWLIST` | recommended | Default: `cursor/phase1-monorepo-scaffold` |

If `CURSOR_CLOUD_AGENTS_API_KEY` is missing, canary returns **BLOCKED** with the exact founder instruction:

> add Cursor Cloud Agents service-account API credential to production secret store under documented name

## Celery

Beat entry `agent-dispatch-reconcile` every `AGENT_DISPATCH_POLL_INTERVAL_SECONDS` (default 60). Also purges expired prompt ciphertexts. Disable with `AGENT_DISPATCH_POLL_ENABLED=false`. API lifespan enqueues startup recover.

## Deploy

1. Merge PR into `cursor/phase1-monorepo-scaffold`
2. Railway API deploys → `alembic upgrade` applies `078` + `079`
3. Set secrets above
4. `GET /api/internal/agent-dispatch/health`

## Recovery without admin override

1. `POST /runs/{id}/cancel` (preferred)
2. Wait for lock lease expiry; next create reclaim stale lease after Cursor reconcile
3. Never force-push scaffold; never auto-merge
