# TWIN Agent Dispatcher — Security

## Threat table

| Threat | Mitigation |
|--------|------------|
| Stolen dispatcher token | Scoped tokens (`create`/`read`/`cancel`/`admin`); rotate via secret store; fingerprints only in audit |
| Prompt leakage in logs/DB | Fernet ciphertext at rest; redacted preview; drop ciphertext on terminal; never log raw prompt |
| Secret in prompt body | Regex redaction before preview/audit; policy forbids committing secrets |
| Webhook spoofing | HMAC-SHA256 `X-Webhook-Signature` = `sha256=<hex>` over raw body (Cursor docs) |
| Webhook replay | Dedupe on `X-Webhook-ID` / delivery hash |
| Concurrent agent chaos | Postgres unique lock `(repo_url, base_branch)` + lease heartbeat; 409 on conflict |
| Lock stuck after crash | Lease expiry + Celery reconcile + admin `force-unlock` (audited) |
| Cursor credential leak | Env-only `CURSOR_CLOUD_AGENTS_API_KEY`; never in repo/CLI argv/artifacts |
| SSRF via webhook URL | Outbound webhook URL is operator-configured env, not caller-controlled |
| Repo escape | Allowlists for repository URL + base branch |
| Privilege escalation | Admin scope required for force-unlock + canary |
| CI false success | Optional `AGENT_DISPATCH_REQUIRE_CI_SUCCESS` → `needs_attention` |

## Auth model

`Authorization: Bearer <AGENT_DISPATCH_TOKEN>`  
Optional multi-token: `AGENT_DISPATCH_TOKENS=tokA:create|read,tokB:admin`

Admin scope implies all others.

## Data handling

- Prompt hash = SHA-256 of full rendered envelope (policy + task)
- Ciphertext via existing `token_crypto.encrypt_secret` (Fernet from `SECRET_KEY`)
- Audit `detail_json` is redacted text

## Documented Cursor credential name

`CURSOR_CLOUD_AGENTS_API_KEY`
