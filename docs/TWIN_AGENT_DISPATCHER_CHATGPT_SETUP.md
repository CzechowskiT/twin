# TWIN Agent Dispatcher — ChatGPT / MCP setup

## Goal

ChatGPT → hosted TWIN MCP → Agent Dispatcher → Cursor Cloud Agent → GitHub branch/PR →
structured report/handoff — **without** pasting prompts or Cursor API keys into chat.

## Production endpoint

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
5. Confirm tool list includes `dispatch_twin_agent`, `get_twin_agent_status`, `get_twin_agent_report`, `get_twin_agent_handoff`, `cancel_twin_agent`, `list_twin_agent_runs`, `reconcile_twin_agent_run`.
6. In a new chat: **Developer mode** → enable the TWIN app → ask ChatGPT to dispatch (do not paste Cursor prompts).

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
| `dispatch_twin_agent` | `agent_runs:create` | Start run |
| `get_twin_agent_status` | `agent_runs:read` | Status (+ optional refresh) |
| `get_twin_agent_report` | `agent_runs:read` | Structured report |
| `get_twin_agent_handoff` | `agent_runs:read` | Full handoff package |
| `cancel_twin_agent` | `agent_runs:cancel` | Cancel |
| `list_twin_agent_runs` | `agent_runs:read` | Recent runs |
| `reconcile_twin_agent_run` | `agent_runs:read` | Force reconcile |

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
