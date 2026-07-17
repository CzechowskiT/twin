# TWIN Agent Dispatcher — Security

## Threat model (summary)

| Threat | Mitigation |
|--------|------------|
| Stolen dispatcher token | Scoped Bearer (`agent_runs:create\|read\|cancel\|admin`); fingerprints only in audit |
| Prompt / secret leakage in logs | Redaction scan; Fernet ciphertext; TTL purge; drop on terminal |
| Webhook spoofing | HMAC-SHA256 `X-Webhook-Signature` on raw body; secret ≥32 chars |
| Concurrent agent races | Postgres unique lock `(repo_url, base_branch)` + lease heartbeat |
| Auto-merge / force-push | Policy flags hard-true; no merge APIs; force-unlock **403** |
| Cursor credential leak | Env-only `CURSOR_CLOUD_AGENTS_API_KEY`; never in repo/CLI argv/artifacts |
| Allowlist bypass | Repo + base_branch allowlists enforced before lock |
| Public MCP without auth | Hosted MCP requires Bearer; query-string secrets rejected |
| CI false success | Optional `AGENT_DISPATCH_REQUIRE_CI_SUCCESS` → `needs_attention` |
| Admin override | Disabled (`no_admin_override`); cancel + lease expiry only |

## Auth

`Authorization: Bearer <AGENT_DISPATCH_TOKEN>`  
Optional multi-token: `AGENT_DISPATCH_TOKENS=tokA:agent_runs:create|agent_runs:read,tokB:agent_runs:admin`

**ChatGPT MCP connector:** Official ChatGPT Developer Mode supports OAuth / No Auth / Mixed — not static API keys. TWIN co-hosts OAuth 2.1 (auth code + PKCE); consent proves possession of `AGENT_DISPATCH_TOKEN` and issues short-lived access JWTs. See `docs/TWIN_AGENT_DISPATCHER_CHATGPT_SETUP.md`.

Unauthenticated MCP calls return **401** with `WWW-Authenticate` + RFC 9728 `resource_metadata`. Secrets never in query strings.  
Short aliases `create|read|cancel|admin` normalize to `agent_runs:*`.

Admin scope does **not** auto-grant create/read/cancel (least privilege). Tokens used in ops typically carry all four scopes.

## Prompt storage

- Envelope version `twin-agent-dispatch-prompt/v1`
- SHA-256 of rendered text (policy prefix + user prompt)
- Fernet via existing `token_crypto` when `AGENT_DISPATCH_ENCRYPT_PROMPTS=true`
- `prompt_expires_at` enforced before dispatch; Celery purge drops expired ciphertext
- `AGENT_DISPATCH_DROP_PROMPT_ON_TERMINAL=true` clears ciphertext after finalize

## Cursor credential

Documented production secret name:

`CURSOR_CLOUD_AGENTS_API_KEY`

Never log the value. Client redacts error bodies containing `crsr_`, `Bearer `, `ghp_`, `sk-`.

## Webhooks

Official docs (v0 path; v1 webhooks “coming soon” as of 2026-07-16): verify `sha256=<hex>` HMAC of **raw** body. Store delivery id for dedupe. Polling is the fallback monitor.
