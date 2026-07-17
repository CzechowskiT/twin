# TWIN Agent Dispatcher — Evidence 2026-07-17

Live-chain closure batch (no Dispatcher/MCP rebuild). Gate F = PENDING · Launch = NO-GO.

## SoT audit (runtime wins)

| Item | Result |
|------|--------|
| Scaffold HEAD | `5acd378ff5708c51ec03bddb98df7e676e58e40f` (`cursor/phase1-monorepo-scaffold`) |
| PR #497 | MERGED (`feat/twin-agent-dispatcher-mcp`) |
| Prod API `git_commit` | `5acd378ff5708c51ec03bddb98df7e676e58e40f` (`/api/v1/health`) |
| Alignment | **ALIGNED** |
| Railway project | `responsible-success` / env `production` |
| Service `twin` | Online, 3/3 replicas, deploy `58e61a79-…` (2026-07-16) |
| Postgres / Redis | Online |
| Alembic | single head `079_agent_dispatch_policy` |
| Tables | `agent_dispatch_runs`, `agent_dispatch_locks`, `agent_dispatch_webhook_events`, `agent_dispatch_audit_events` |
| Celery | broker/result Redis present; beat entry `agent-dispatch-reconcile` in code; no separate worker service (API service replicas) |
| Health | `auth_configured=true`, `webhook_configured=true`, `encryption_configured=true`, `mcp_hosted=true`, `mcp_healthy=true`, `cursor_credential_configured=false`, `active_lock_count=0` |
| MCP | `POST /api/internal/agent-dispatch/mcp` — 7 tools listed |
| Allowlists | repo + base branch configured |

## Credential audit (no values)

| Source | Exists | Authorized for CzechowskiT/twin | Railway-usable | API-valid |
|--------|--------|----------------------------------|----------------|-----------|
| Railway `CURSOR_CLOUD_AGENTS_API_KEY` (service `twin`) | **NO** | n/a | **NO** | **NO** |
| GitHub Actions secrets (`CzechowskiT/twin`) | **NO** (no Cursor/dispatch key names) | n/a | **NO** | **NO** |
| Shell env `CURSOR_*` / `AGENT_DISPATCH_*` | **NO** | n/a | **NO** | **NO** |
| Cursor CLI / `agent` binary | **NO** (not on PATH; no `/Applications/Cursor.app` bin) | n/a | **NO** | **NO** |
| macOS Keychain `Cursor Safe Storage` | YES (UI session material only) | unknown | **NO** (cookies/UI session banned) | not probed |
| `~/Library/Application Support/Cursor` session stores | YES (session artifacts) | n/a | **NO** (banned) | not probed |
| Official programmatic SA create API | **NO** — Dashboard only (`Dashboard → Settings → API Keys → Service Accounts`) | n/a | n/a | n/a |

Other dispatcher secrets on Railway (presence only): `AGENT_DISPATCH_TOKEN` YES · webhook secret YES · webhook public URL YES · `AGENT_DISPATCH_GITHUB_TOKEN` ABSENT (enrichment optional) · encryption via `SECRET_KEY` YES.

Fingerprint / rotation metadata: credential **absent** → no fingerprint; rotation n/a until first install.

## Official SA path

Cursor docs (2026-07-17): Cloud Agents API accepts user API key or **service account** API key. Service accounts are created by admins in the Cursor Dashboard; API key shown once. **No autonomous programmatic create path** with available permissions.

## Gate probes (not fake live)

| Probe | Result |
|-------|--------|
| `GET /canary` (Bearer) | `200` `status=BLOCKED` + exact founder action naming `CURSOR_CLOUD_AGENTS_API_KEY` |
| MCP `dispatch_twin_agent` (read-only audit prompt) | accepted; run `f7857c2e-…` → `failed` / `cursor_create_failed` / `CURSOR_CLOUD_AGENTS_API_KEY not configured`; **no** `cursor_agent_id` / `cursor_run_id` |
| Locks after probe | `active_lock_count=0`; DB `agent_dispatch_locks` count `0` |
| Non-terminal runs | none |
| Historical runs | `cancelled` smoke `738c5f1a-…`; `failed` credential probe `f7857c2e-…` |

## Live canary / conflict / feature

| Stage | Result |
|-------|--------|
| Read-only live canary via Cursor | **NOT RUN** (credential blocker — no fake live) |
| Parallel 409 during live | **NOT RUN** |
| Cancellation live | **NOT RUN** (N/A); official cancel endpoints exist in contract (`v1` cancel / `v0` stop) |
| Feature `dispatcher-runtime-contract-guard` | **NOT RUN** |
| GitHub branch/PR from this batch | **none** (no infra fix PR — code healthy) |

## Cleanup

- Stale locks: **0**
- Orphaned/non-terminal runs: **0**
- No Dispatcher/MCP rebuild; no empty `fix/twin-agent-live-run-closure` PR

## Hard stance

- Gate F: **PENDING** (unchanged)
- Platform Launch: **NO-GO** (unchanged)
- Access gap (single founder action):

> Create one Cursor Cloud Agents service-account credential authorized for CzechowskiT/twin and store it in the Railway production secret store as CURSOR_CLOUD_AGENTS_API_KEY.
