# TWIN Agent Dispatcher — ChatGPT / MCP setup

## Goal

ChatGPT (or any MCP client) → hosted TWIN MCP → Agent Dispatcher → Cursor Cloud Agent → GitHub branch/PR → structured report/handoff — **without** pasting prompts or Cursor API keys into chat.

## Production endpoint

| Item | Value |
|------|--------|
| API base | `https://twin-production-bcd9.up.railway.app` |
| MCP JSON-RPC | `POST /api/internal/agent-dispatch/mcp` |
| MCP manifest | `GET /api/internal/agent-dispatch/mcp/manifest` |
| Health (public) | `GET /api/internal/agent-dispatch/health` |

## Auth (required)

```http
Authorization: Bearer <AGENT_DISPATCH_TOKEN>
Content-Type: application/json
```

- Token lives only in Railway (`AGENT_DISPATCH_TOKEN`) and the ChatGPT connector secret store.
- **Never** put the token (or `CURSOR_CLOUD_AGENTS_API_KEY`) in the URL query string.
- Anonymous MCP calls return **401**. Public MCP without auth is banned.

## ChatGPT custom connector / MCP client

1. Server URL: `https://twin-production-bcd9.up.railway.app/api/internal/agent-dispatch/mcp`
2. Auth: Bearer token = production `AGENT_DISPATCH_TOKEN`
3. Transport: Streamable HTTP JSON-RPC (`initialize` → `tools/list` → `tools/call`)
4. After a run finishes, call `get_twin_agent_handoff` with `run_id` — do not copy agent prompts from the UI.

### Example `tools/call`

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "dispatch_twin_agent",
    "arguments": {
      "task_name": "docs-guard-consistency",
      "prompt": "…",
      "repository": "https://github.com/CzechowskiT/twin",
      "base_branch": "cursor/phase1-monorepo-scaffold",
      "idempotency_key": "chatgpt-batch-2026-07-16-1",
      "auto_create_pr": true
    }
  }
}
```

`execution_policy` is server-enforced (all flags must stay `true`). Weakening returns an error.

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

## Cursor credential (separate)

Dispatcher calls Cursor with Railway secret `CURSOR_CLOUD_AGENTS_API_KEY` (service-account / Cloud Agents API key). ChatGPT never sees it.

If missing, `GET .../canary` returns **BLOCKED** with the exact founder action:

> Create one Cursor Cloud Agents service-account credential authorized for CzechowskiT/twin and store it in the existing Railway production secret store as CURSOR_CLOUD_AGENTS_API_KEY.

## CLI smoke (same token)

```bash
export TWIN_API_BASE_URL=https://twin-production-bcd9.up.railway.app
export AGENT_DISPATCH_TOKEN=…   # from secret store — not chat
node frontend/scripts/twin-agent-dispatch.mjs health
node frontend/scripts/twin-agent-dispatch.mjs canary
node frontend/scripts/twin-agent-dispatch.mjs mcp-list-tools
```

## Hard rules

- Manual merge only — Dispatcher never merges.
- Single active run per repo+base branch (HTTP **409** on conflict).
- No secrets in logs, repo, or MCP query strings.
- Gate F / Launch stay **NO-GO** until founder flips them.
