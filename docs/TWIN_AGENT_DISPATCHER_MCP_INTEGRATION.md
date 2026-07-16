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
| `dispatch_twin_agent` | `POST /runs` | `agent_runs:create` |
| `get_twin_agent_status` | `GET /runs/{id}` | `agent_runs:read` |
| `get_twin_agent_report` | `GET /runs/{id}/report` | `agent_runs:read` |
| `get_twin_agent_handoff` | `GET /runs/{id}/handoff` | `agent_runs:read` |
| `cancel_twin_agent` | `POST /runs/{id}/cancel` | `agent_runs:cancel` |
| `list_twin_agent_runs` | `GET /runs` | `agent_runs:read` |
| `reconcile_twin_agent_run` | `POST /runs/{id}/reconcile` | `agent_runs:read` |

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

## Auth for connector

- `AGENT_DISPATCH_TOKEN` only in the MCP client
- Never embed `CURSOR_CLOUD_AGENTS_API_KEY` in ChatGPT / MCP
- No secrets in query strings

## Idempotency

Pass `idempotency_key` from ChatGPT/MCP so retries do not double-dispatch.

## Version metadata

- MCP protocol: `2025-06-18`
- Server: `twin-agent-dispatcher` `1.0.0`
- Cursor contract date: see `cursor_contract_doc_date` on `/health`
