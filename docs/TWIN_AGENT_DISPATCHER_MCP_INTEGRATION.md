# TWIN Agent Dispatcher — MCP integration readiness

## Status

**MCP-ready HTTP contract: yes** · **Hosted MCP server in this batch: no** (next batch).

Official Cursor docs (2026-07-16): *“MCP (Model Context Protocol) is not yet supported by the Cloud Agents API”* for launching agents via MCP inside Cursor Cloud. This document covers **calling TWIN Dispatcher from an MCP client** (ChatGPT/Cursor MCP connector), not Cursor-native agent MCP.

## Tool → HTTP map (proposed connector)

| MCP tool | HTTP | Scope |
|----------|------|-------|
| `twin_agent_dispatch` | `POST /runs` | `agent_runs:create` |
| `twin_agent_status` | `GET /runs/{id}` | `agent_runs:read` |
| `twin_agent_wait` | poll `GET /runs/{id}?refresh=true` | `agent_runs:read` |
| `twin_agent_cancel` | `POST /runs/{id}/cancel` | `agent_runs:cancel` |
| `twin_agent_report` | `GET /runs/{id}/report` | `agent_runs:read` |
| `twin_agent_health` | `GET /health` | none |
| `twin_agent_contract` | `GET /contract` | `agent_runs:read` |

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

## Auth for connector

- `AGENT_DISPATCH_TOKEN` (or scoped token with needed permissions)
- Never embed Cursor API key in the MCP client — only the dispatcher token
- Base URL: production API host (`TWIN_API_BASE_URL`)

## Idempotency

Pass `idempotency_key` from ChatGPT/MCP tool calls so retries do not double-dispatch.

## Next batch

Ship ChatGPT/MCP connector wrapping the table above + first full autonomous feature run without manual prompt copy.
