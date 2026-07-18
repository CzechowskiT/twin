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
| GET | `/runs` | `agent_runs:read` | List recent runs |
| GET | `/runs/{id}/report` | `agent_runs:read` | Final report slice |
| GET | `/runs/{id}/handoff` | `agent_runs:read` | ChatGPT/MCP handoff package |
| POST | `/runs/{id}/cancel` | `agent_runs:cancel` | Cancel + release lock |
| POST | `/runs/{id}/operator/create-pull-request` | `agent_runs:admin` | Idempotent explicit PR creation |
| POST | `/runs/{id}/operator/run` | `agent_runs:admin` | Explicit standard merge and verified release gates |
| POST | `/mcp` | Bearer + scopes | Hosted MCP JSON-RPC |
| GET | `/mcp/manifest` | `agent_runs:read` | Tool schemas + version |
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
| `AGENT_DISPATCH_GITHUB_TOKEN` | optional; required for Operator | Dedicated GitHub App installation token; Actions write plus read-only PR/contents/deployments access when workflow mode is enabled |
| `AGENT_DISPATCH_REPO_ALLOWLIST` | recommended | Default: `https://github.com/CzechowskiT/twin` |
| `AGENT_DISPATCH_BASE_BRANCH_ALLOWLIST` | recommended | Default: `cursor/phase1-monorepo-scaffold` |

If `CURSOR_CLOUD_AGENTS_API_KEY` is missing, canary returns **BLOCKED** with the exact founder instruction:

> Create one Cursor Cloud Agents service-account credential authorized for CzechowskiT/twin and store it in the existing Railway production secret store as CURSOR_CLOUD_AGENTS_API_KEY.

Prompt encryption uses existing `SECRET_KEY` via `token_crypto` (no separate `AGENT_DISPATCH_ENCRYPTION_KEY`).

ChatGPT setup: [TWIN_AGENT_DISPATCHER_CHATGPT_SETUP.md](./TWIN_AGENT_DISPATCHER_CHATGPT_SETUP.md)

## Celery

Beat entry `agent-dispatch-reconcile` every `AGENT_DISPATCH_POLL_INTERVAL_SECONDS` (default 60). Also purges expired prompt ciphertexts. Disable with `AGENT_DISPATCH_POLL_ENABLED=false`. API lifespan enqueues startup recover.

Operator is disabled by default (`AGENT_DISPATCH_OPERATOR_ENABLED=false`).
Configure a bounded timeout/poll interval and
`AGENT_DISPATCH_OPERATOR_REGRESSION_WORKFLOW` before enabling it. Startup
recovery resumes only `merging`, `deploying`, `regression`, and `finalizing`;
`waiting_for_operator` always requires a new explicit admin-scoped call.
The merge credential must be a dedicated identity without administrator or
ruleset bypass rights; attest this deployment prerequisite with
`AGENT_DISPATCH_OPERATOR_NON_BYPASS_IDENTITY=true`. Operator refuses to run
without that explicit capability declaration.

Production uses `.github/workflows/operator-service.yml` for GitHub mutations:
set both `AGENT_DISPATCH_OPERATOR_MUTATION_WORKFLOW` and
`AGENT_DISPATCH_OPERATOR_REGRESSION_WORKFLOW` to `operator-service.yml`.
The external installation token only dispatches and observes Actions; the
ephemeral workflow `GITHUB_TOKEN` has explicit `contents: write`,
`pull-requests: write`, `actions: read`, and `deployments: read` permissions.
The workflow hard-rejects every repository except `CzechowskiT/twin` and every
base except `cursor/phase1-monorepo-scaffold`. A direct merge token remains
supported only when `AGENT_DISPATCH_OPERATOR_MUTATION_WORKFLOW` is empty.

## Deploy

1. Merge PR into `cursor/phase1-monorepo-scaffold`
2. Railway API deploys → `alembic upgrade` applies migrations through `081`
3. Set secrets above
4. `GET /api/internal/agent-dispatch/health`

## Recovery without admin override

1. `POST /runs/{id}/cancel` (preferred)
2. Wait for lock lease expiry; next create reclaim stale lease after Cursor reconcile
3. Never force-push scaffold; never auto-merge

Operator failures are fail-closed: the run becomes `needs_attention`, keeps
unverified artifact flags false, records a stable `reason_code`, and releases
its lock. A missing merge-capable token/tool is
`operator_capability_missing`; it must never be simulated.
