# TWIN Agent Dispatcher — ChatGPT / MCP setup

## Goal

ChatGPT → hosted TWIN MCP → Agent Dispatcher → Cursor Cloud Agent → GitHub branch/PR →
structured report/handoff — **without** pasting prompts or Cursor API keys into chat.

## Cost approval before execution

See [the no-spend integration runbook](./TWIN_CURSOR_NO_SPEND_INTEGRATION_2026-11-03.md).
The server defaults to `AGENT_DISPATCH_BILLABLE_EXECUTION_ENABLED=false`.
First call `get_twin_cursor_readiness` with read scope: it checks configuration
without contacting Cursor or launching an agent. An API key and a `read_only`
task are not cost approval. New and deferred dispatch requests are blocked
until an operator enables a specifically Founder-approved execution window.
The switch is not a provider spending cap; provider-side limits must be verified
separately. Connector setup alone never authorizes execution, merge or deploy.

## Production endpoint

### Read-only connection contract (pending deployment)

For the initial connection use OAuth with `scope=agent_runs:read`. Omitted scope
now defaults to read-only. Requested scopes must be a subset of the authenticating
principal's permissions; code exchange and refresh retain the narrowed grant.
Malformed or empty scope claims never fall back to administrator permissions.

Cached status, list, report and handoff remain available. Status refresh and
reconciliation require both read and create scopes because they can enter Operator
execution. This authorization change and the cost interlock are prepared in code;
do not assume they are deployed to the existing production endpoint below.
Existing valid broad-scope tokens are not revoked by this patch; issue a new
read-only grant for the new connection after deployment.

The chat currently has no TWIN tools or API for registering a personal custom MCP
connection. Its installation and OAuth consent must be completed in the account's
supported connection UI. This is a one-time account action, not prompt copying.

| Item | Value |
|------|--------|
| API base | `https://twin-production-bcd9.up.railway.app` |
| MCP (Streamable HTTP JSON-RPC) | `POST /api/internal/agent-dispatch/mcp` |
| MCP manifest | `GET /api/internal/agent-dispatch/mcp/manifest` |
| Health (public) | `GET /api/internal/agent-dispatch/health` |
| Setup hint (public) | `GET /api/internal/agent-dispatch/chatgpt/setup` |
| Actions OpenAPI (public) | `GET /api/internal/agent-dispatch/chatgpt/openapi.json` |

## Why OAuth (not static Bearer) for ChatGPT MCP

Official ChatGPT **Developer Mode** remote MCP auth (OpenAI docs, 2026): **OAuth**, **No Authentication**, or **Mixed Authentication**.  
ChatGPT does **not** accept a static API key / Bearer field for MCP connectors.

TWIN therefore co-hosts a minimal OAuth 2.1 authorization server (auth code + PKCE S256) that issues short-lived access tokens after the founder proves possession of `AGENT_DISPATCH_TOKEN`. CLI / Custom GPT Actions still use `Authorization: Bearer <AGENT_DISPATCH_TOKEN>` directly.

- Token lives only in Railway (`AGENT_DISPATCH_TOKEN`) and is pasted **once** into the OAuth consent page (not stored in ChatGPT as a static MCP key).
- **Never** put the token (or `CURSOR_CLOUD_AGENTS_API_KEY`) in the MCP URL query string.
- Anonymous MCP calls return **401** with `WWW-Authenticate` + RFC 9728 `resource_metadata`.
- Public MCP without auth is banned.

## Path A (preferred) — ChatGPT Developer Mode MCP app

One-time founder UI (cannot be automated via OpenAI API for personal connectors):

1. ChatGPT → **Settings → Security and login** → enable **Developer mode**.
2. Open **Settings → Plugins** or [chatgpt.com/plugins](https://chatgpt.com/plugins).
3. Create a developer-mode app / connector:
   - **Name:** `TWIN Agent Dispatcher`
   - **MCP server URL:** `https://twin-production-bcd9.up.railway.app/api/internal/agent-dispatch/mcp`
   - **Authentication:** **OAuth** (not “None”)
4. Complete OAuth: ChatGPT redirects to TWIN authorize page → paste production `AGENT_DISPATCH_TOKEN` from the secret store → Allow.
5. Confirm tool list includes `get_twin_cursor_readiness`, `dispatch_twin_agent`, `get_twin_agent_status`, `get_twin_agent_report`, `get_twin_agent_handoff`, `cancel_twin_agent`, `list_twin_agent_runs`, `reconcile_twin_agent_run`.
6. In a new chat enable the TWIN app, then call `get_twin_cursor_readiness`. Do not dispatch until explicit cost approval and verified provider spending controls are in place.

Discovery endpoints ChatGPT uses automatically:

| Discovery | URL |
|-----------|-----|
| Protected resource metadata | `GET /.well-known/oauth-protected-resource/api/internal/agent-dispatch/mcp` |
| Authorization server metadata | `GET /.well-known/oauth-authorization-server/api/internal/agent-dispatch/oauth` |
| Authorize | `GET/POST /api/internal/agent-dispatch/oauth/authorize` |
| Token | `POST /api/internal/agent-dispatch/oauth/token` |
| DCR (optional) | `POST /api/internal/agent-dispatch/oauth/register` |

## Path B (fallback) — Custom GPT Actions + Bearer

If MCP connector registration is unavailable on the account:

1. Create a Custom GPT → Actions → Import from URL:  
   `https://twin-production-bcd9.up.railway.app/api/internal/agent-dispatch/chatgpt/openapi.json`
2. Authentication: **API Key** → Auth Type **Bearer** → value = production `AGENT_DISPATCH_TOKEN`.
3. Operations map 1:1 to dispatcher tools (`dispatch_twin_agent`, status, report, handoff, …).

## Tools

| Tool | Scope | Purpose |
|------|-------|---------|
| `get_twin_cursor_readiness` | `agent_runs:read` | Configuration and cost interlock only; no remote requests |
| `dispatch_twin_agent` | `agent_runs:create` | Start run |
| `get_twin_agent_status` | `agent_runs:read` (+ create for refresh) | Cached status; refresh requires execution scope |
| `get_twin_agent_report` | `agent_runs:read` | Structured report |
| `get_twin_agent_handoff` | `agent_runs:read` | Full handoff package |
| `cancel_twin_agent` | `agent_runs:cancel` | Cancel |
| `list_twin_agent_runs` | `agent_runs:read` | Recent runs |
| `reconcile_twin_agent_run` | `agent_runs:read` + `agent_runs:create` | Force reconcile; may enter Operator execution |

Allowlist: `https://github.com/CzechowskiT/twin` + `cursor/phase1-monorepo-scaffold` only.  
`execution_policy` is server-enforced (all flags must stay `true`).

## Cursor credential (separate)

Dispatcher calls Cursor with Railway secret `CURSOR_CLOUD_AGENTS_API_KEY`. ChatGPT never sees it.

## CLI smoke (Bearer — same token)

```bash
export TWIN_API_BASE_URL=https://twin-production-bcd9.up.railway.app
export AGENT_DISPATCH_TOKEN=…   # from secret store — not chat
node frontend/scripts/twin-agent-dispatch.mjs health
node frontend/scripts/twin-agent-dispatch.mjs canary
node frontend/scripts/twin-agent-dispatch.mjs mcp-list-tools
```

OAuth smoke (no ChatGPT UI):

```bash
# After deploy: GET well-known metadata (public)
curl -sS "$TWIN_API_BASE_URL/.well-known/oauth-protected-resource/api/internal/agent-dispatch/mcp"
curl -sS "$TWIN_API_BASE_URL/.well-known/oauth-authorization-server/api/internal/agent-dispatch/oauth"
```

## Hard rules

- Manual merge only — Dispatcher never merges.
- Single active run per repo+base branch (HTTP **409** on conflict).
- No secrets in logs, repo, or MCP query strings.
- Do not flip Gate F / Launch from this connector setup alone.
