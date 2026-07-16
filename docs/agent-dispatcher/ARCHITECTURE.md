# TWIN Agent Dispatcher — Architecture

**Contract audit date:** 2026-07-16  
**Cursor API contract version:** `v1-public-beta+v0-webhooks`  
**Docs:** [Cloud Agents API v1](https://cursor.com/docs/cloud-agent/api/endpoints) · [v0 legacy](https://cursor.com/docs/cloud-agent/api/v0) · [Webhooks](https://cursor.com/docs/cloud-agent/api/webhooks) · [API overview](https://cursor.com/docs/api)

## Goal

Replace manual paste of huge prompts into Cursor with a production-safe HTTP service that:

1. Creates Cursor Cloud Agents runs (programmatic)
2. Monitors them (webhook + polling)
3. Enforces a single-active-run lock per `(repository_url, base_branch)`
4. Captures final report / branch / PR / SHA (+ optional CI)
5. Exposes CLI + MCP-ready JSON contracts

## Components

```
CLI / MCP / founder tooling
        │  Bearer AGENT_DISPATCH_TOKEN (+ scopes)
        ▼
Dispatcher API  (/api/internal/agent-dispatch/*)
        │
        ├── Auth (scoped Bearer fingerprints)
        ├── Prompt envelope (policy prefix + SHA-256 + Fernet ciphertext)
        ├── Lock service (Postgres unique lease + heartbeat)
        ├── Cursor client (https://api.cursor.com)
        │     • v1 POST /v1/agents when no webhook URL
        │     • v0 POST /v0/agents when webhook URL configured
        │       (v1 webhooks: "coming soon" per official docs 2026-07-16)
        ├── Webhook receiver (HMAC sha256=, dedupe by X-Webhook-ID)
        ├── Polling worker (Celery beat reconcile)
        ├── GitHub enricher (branch / PR / SHA / combined status)
        └── Redacted audit events
```

## State machine (TWIN)

`queued` → `dispatching` → `running` → `awaiting_result` → `succeeded`  
                                           ↘ `needs_attention` (GitHub mismatch)  
Failures: `failed` · `timed_out` · `cancelling` → `cancelled`

Cursor v1 run statuses mapped: `CREATING`/`RUNNING` → running; `FINISHED` → awaiting_result; `ERROR` → failed; `CANCELLED` → cancelled; `EXPIRED` → timed_out.

## Persistence

Tables (migration `078_agent_dispatch`):

- `agent_dispatch_runs`
- `agent_dispatch_locks` (unique `repo_url + base_branch`)
- `agent_dispatch_webhook_events` (delivery dedupe)
- `agent_dispatch_audit_events` (redacted)

## Why inside TWIN backend

One FastAPI service, one Postgres, one Celery/Redis stack — additive migration only. Follows existing ops auth / HMAC webhook / Fernet patterns.
