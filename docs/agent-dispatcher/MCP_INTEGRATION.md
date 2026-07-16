# TWIN Agent Dispatcher — MCP integration readiness

## Status

**MCP-ready contract:** yes (JSON HTTP).  
**Hosted MCP server package:** not shipped in this batch (next batch).

Official Cursor docs (2026-07-16): *“MCP (Model Context Protocol) is not yet supported by the Cloud Agents API”* for launching agents via MCP inside Cursor Cloud. This document covers **calling TWIN Dispatcher from an MCP client** (ChatGPT/Cursor MCP connector), not Cursor-native agent MCP.

## Tool surface (proposed MCP tools → HTTP)

| MCP tool | HTTP | Scope |
|----------|------|-------|
| `twin_agent_dispatch` | `POST /runs` | create |
| `twin_agent_status` | `GET /runs/{id}?refresh=true` | read |
| `twin_agent_wait` | poll status until terminal | read |
| `twin_agent_cancel` | `POST /runs/{id}/cancel` | cancel |
| `twin_agent_report` | `GET /runs/{id}/report` | read |
| `twin_agent_canary` | `GET /canary` | admin |
| `twin_agent_contract` | `GET /contract` | read |

## Auth for MCP server process

Environment only:

- `TWIN_API_BASE_URL`
- `AGENT_DISPATCH_TOKEN` (or scoped token with needed permissions)

Never accept API keys as tool arguments.

## Idempotency

Pass `idempotency_key` on create so MCP retries do not double-dispatch.

## Next batch

Ship a thin MCP server (stdio or HTTP) wrapping the table above + first full feature run without paste.
