# TWIN Agent Dispatcher — Architecture

**Contract audit date:** 2026-07-16  
**Cursor API contract version:** `v1-public-beta+v0-webhooks`  
**Docs:** [Cloud Agents API v1](https://cursor.com/docs/cloud-agent/api/endpoints) · [v0 legacy](https://cursor.com/docs/cloud-agent/api/v0) · [Webhooks](https://cursor.com/docs/cloud-agent/api/webhooks) · [API overview](https://cursor.com/docs/api)

## Goal

Replace manual paste of huge prompts into Cursor with a production-safe HTTP service that:

1. Creates Cursor Cloud Agents runs (programmatic)
2. Monitors them (webhook + polling reconciliation)
3. Enforces a single-active-run lock per `(repository_url, base_branch)`
4. Captures final report / branch / PR / SHA (+ optional CI)
5. Exposes CLI + **hosted MCP** (same backend) for ChatGPT without prompt copy

## Components

```
ChatGPT / CLI / MCP client
        │  Bearer AGENT_DISPATCH_TOKEN (+ agent_runs:* scopes)
        ▼
Dispatcher API  (/api/internal/agent-dispatch/*)
        │
        ├── Hosted MCP JSON-RPC (POST /mcp) — tools listed below
        ├── Auth (scoped Bearer fingerprints)
        ├── Prompt envelope (policy prefix + SHA-256 + Fernet ciphertext + TTL)
        ├── Lock service (Postgres unique lease + heartbeat)
        ├── Cursor client (https://api.cursor.com)
        │     • v1 POST /v1/agents when no webhook URL
        │     • v0 POST /v0/agents when webhook URL configured
        │       (v1 webhooks: "coming soon" per official docs 2026-07-16)
        ├── Webhook receiver (HMAC sha256=, dedupe by X-Webhook-ID)
        ├── Polling worker (Celery beat reconcile + prompt TTL purge)
        ├── GitHub enricher (branch / PR / SHA / combined status)
        ├── Operator Service (explicit verified mutations; disabled by default)
        ├── Report + handoff retrieval (no manual prompt copy)
        └── Redacted audit events
```

MCP tools: `dispatch_twin_agent`, `get_twin_agent_status`, `get_twin_agent_report`,
`get_twin_agent_handoff`, `cancel_twin_agent`, `list_twin_agent_runs`,
`reconcile_twin_agent_run`. Setup: [TWIN_AGENT_DISPATCHER_CHATGPT_SETUP.md](./TWIN_AGENT_DISPATCHER_CHATGPT_SETUP.md).

## Cursor API contract

| Concern | v1 | v0 webhook path |
|---------|----|-----------------|
| Create payload | `repos`, `model: {id}`, optional top-level `name`, `autoCreatePR` | `source` / `target`, `model` string, `autoCreatePr`; **no top-level `name`** (rejected with HTTP 400) |
| Read | `GET /v1/agents/{id}/runs/{runId}` | `GET /v0/agents/{id}` |
| Cancel | `POST /v1/agents/{id}/runs/{runId}/cancel` | `POST /v0/agents/{id}/stop` |

`task_name` is TWIN metadata, not a v0 Cursor request field. If a persisted v1
record lacks `run_id`, the client resolves `latestRunId` through
`GET /v1/agents/{id}`; it never falls back to a v0 endpoint.

## Create contract

`POST /api/internal/agent-dispatch/runs`

| Field | Notes |
|-------|--------|
| `task_name` | Required label for the batch |
| `repository` | Allowlisted GitHub URL (`repository_url` alias accepted) |
| `base_branch` | Allowlisted (default `cursor/phase1-monorepo-scaffold`) |
| `prompt` | Large text; stored encrypted + hashed |
| `execution_policy` | All flags must be `true` (see below) |
| `auto_create_pr` | Default `false` (opt-in PR open; never auto-merge) |

### Execution policy (hard)

- `single_active_run`
- `manual_merge_only`
- `no_admin_override` (force-unlock endpoint returns 403)
- `no_auto_merge`
- `final_report_once`

## State machine (TWIN)

`queued` → `dispatching` → `running` → `awaiting_result` → `succeeded`
                                           ↘ `waiting_for_operator` → `merging` → `deploying` → `regression` → `finalizing` → `succeeded`
                                           ↘ `needs_attention` (GitHub mismatch or Operator failure)
Failures: `failed` · `timed_out` · `cancelling` → `cancelled`

Cursor v1 run statuses mapped: `CREATING`/`RUNNING` → running; `FINISHED` → awaiting_result; `ERROR` → failed; `CANCELLED` → cancelled; `EXPIRED` → timed_out.
Cursor v0 agent statuses mapped: `CREATING`/`RUNNING` → running; `FINISHED` → awaiting_result; `ERROR` → failed.

## Persistence

Tables (migrations `078_agent_dispatch` through `081_agent_dispatch_operator`):

- `agent_dispatch_runs` (+ `task_name`, `execution_policy_json`)
- `agent_dispatch_locks` (unique `repo_url + base_branch`)
- `agent_dispatch_webhook_events` (delivery dedupe)
- `agent_dispatch_audit_events` (redacted)
- `agent_dispatch_operator_operations` (idempotency, retries, restart recovery)

## Operator boundary

The Dispatcher can enter `waiting_for_operator` only when the persisted execution
policy is unchanged, the task explicitly requires merge, the PR is mergeable, and
both PR existence and CI PASS were verified. The admin-scoped
`POST /runs/{id}/operator/run` is the explicit manual action required by
`manual_merge_only`; it returns `202` after enqueueing a durable worker task,
and no background task starts a waiting merge without that explicit call.

Operator uses GitHub's standard merge endpoint with the expected head SHA. It
does not request auto-merge, admin override, force push, or branch-protection
bypass. Enabling it requires an explicit deployment attestation that the
dedicated GitHub identity has no administrator/ruleset bypass rights. Each
stage records a correlation ID, structured log, low-cardinality
metric, redacted audit event, and idempotent operation row. Startup recovery
resumes stages already in progress but never starts `waiting_for_operator`.
Report and handoff v2 response shapes are unchanged.

## Why inside TWIN backend

One FastAPI service, one Postgres, one Celery/Redis stack — additive migration only. Follows existing ops auth / HMAC webhook / Fernet patterns.
