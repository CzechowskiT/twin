# TWIN Agent Dispatcher — MCP integration

## Status

**MCP-ready HTTP contract: yes** · **Hosted MCP server: yes** (same Railway backend).

Official Cursor docs (2026-07-16): Cloud Agents API does **not** launch agents via Cursor-native MCP. This document covers **calling TWIN Dispatcher from an MCP client** (ChatGPT connector / Cursor MCP).

Setup runbook: [TWIN_AGENT_DISPATCHER_CHATGPT_SETUP.md](./TWIN_AGENT_DISPATCHER_CHATGPT_SETUP.md)

## Endpoint

`POST https://<api>/api/internal/agent-dispatch/mcp`  
Auth: `Authorization: Bearer <AGENT_DISPATCH_TOKEN>`  
Rate limit: 60/minute (IP). No anonymous access.

## Tool → HTTP map

| MCP tool | HTTP | Scope |
|----------|------|-------|
| `get_twin_cursor_readiness` | MCP configuration-only tool; no downstream HTTP call | `agent_runs:read` |
| `dispatch_twin_agent` | `POST /runs` | `agent_runs:create` |
| `get_twin_agent_status` | `GET /runs/{id}` | `agent_runs:read`; also create when refresh=true |
| `get_twin_agent_report` | `GET /runs/{id}/report` | `agent_runs:read` |
| `get_twin_agent_handoff` | `GET /runs/{id}/handoff` | `agent_runs:read` |
| `cancel_twin_agent` | `POST /runs/{id}/cancel` | `agent_runs:cancel` |
| `list_twin_agent_runs` | `GET /runs` | `agent_runs:read` |
| `reconcile_twin_agent_run` | `POST /runs/{id}/reconcile` | `agent_runs:read` + `agent_runs:create` |

## Create tool arguments

```json
{
  "task_name": "string",
  "repository": "https://github.com/CzechowskiT/twin",
  "base_branch": "cursor/phase1-monorepo-scaffold",
  "prompt": "string",
  "execution_policy": {
    "single_active_run": true,
    "manual_merge_only": true,
    "no_admin_override": true,
    "no_auto_merge": true,
    "final_report_once": true
  },
  "auto_create_pr": false,
  "idempotency_key": "optional-string"
}
```

Server rejects any weakened `execution_policy` flag.

The server also defaults to `AGENT_DISPATCH_BILLABLE_EXECUTION_ENABLED=false`.
New/deferred dispatch, Cursor create and GitHub Operator writes fail closed
with `founder_cost_approval_required`. Read-only task intent does not waive
cost approval. No tool argument can enable spending. Start with
`get_twin_cursor_readiness`; it does not validate the key or live connectivity.
See [the cost interlock runbook](./TWIN_CURSOR_NO_SPEND_INTEGRATION_2026-11-03.md).

## Auth for connector

- **ChatGPT MCP connector:** OAuth 2.1 (auth code + PKCE). ChatGPT does not support static API keys for MCP. See [TWIN_AGENT_DISPATCHER_CHATGPT_SETUP.md](./TWIN_AGENT_DISPATCHER_CHATGPT_SETUP.md).
- **CLI / Custom GPT Actions:** `Authorization: Bearer <AGENT_DISPATCH_TOKEN>`
- Never embed `CURSOR_CLOUD_AGENTS_API_KEY` in ChatGPT / MCP
- No secrets in query strings
- Unauthenticated MCP → **401** + `WWW-Authenticate` with `resource_metadata`

## Idempotency

Pass `idempotency_key` from ChatGPT/MCP so retries do not double-dispatch.

## Version metadata

- MCP protocol: `2025-06-18`
- Server: `twin-agent-dispatcher` `1.1.0`
- Cursor contract date: see `cursor_contract_doc_date` on `/health`
