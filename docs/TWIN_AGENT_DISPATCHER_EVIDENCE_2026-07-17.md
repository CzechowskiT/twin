# TWIN Agent Dispatcher — Evidence 2026-07-17

Live-chain closure batch. Gate F = **PASS** · Platform Launch = **READY**.

## SoT audit (runtime wins)

| Item | Result |
|------|--------|
| Scaffold HEAD | `760e96f4a3e5a930a9e7eebfbb5a3d96802985f0` (`cursor/phase1-monorepo-scaffold`) |
| Prod API `git_commit` | `760e96f4a3e5a930a9e7eebfbb5a3d96802985f0` (`/api/v1/health`) |
| Alignment | **ALIGNED** |
| Railway project | `responsible-success` / env `production` |
| Service `twin` | Online · https://twin-production-bcd9.up.railway.app |
| Health | `auth_configured=true`, `webhook_configured=true`, `encryption_configured=true`, `mcp_hosted=true`, `mcp_healthy=true`, `cursor_credential_configured=true`, `active_lock_count=0` |
| MCP | `POST /api/internal/agent-dispatch/mcp` — 7 tools |
| Allowlists | repo + base branch configured |

## Credential audit (presence / fingerprint only — no values)

| Source | Exists | Notes |
|--------|--------|-------|
| Railway `CURSOR_CLOUD_AGENTS_API_KEY` | **YES** | fp `8205b37cd1b1`; len=69 |
| Railway `AGENT_DISPATCH_TOKEN` | **YES** | fp `5cf93dd40f88` |
| Webhook secret + public URL | **YES** | webhook path active (v0 create) |
| `AGENT_DISPATCH_GITHUB_TOKEN` | **NO** | enrichment optional; CI verified via `gh` |

## Cursor auth (Phase 2)

| Probe | Result |
|-------|--------|
| `GET /api/internal/agent-dispatch/canary` | **OK** (`/v1/me` + `/v0/me`) |
| Repo authorization `CzechowskiT/twin` | **PASS** (`GET /v0/repositories` + `/v1/repositories`) |
| Secret leakage in health/canary/MCP | **none** (fingerprints / redacted previews only) |

## Blocker found + closed

| Item | Detail |
|------|--------|
| Symptom | First live MCP dispatch failed: `cursor_create_failed` / HTTP **400** on `POST /v0/agents` |
| Root cause | Client sent top-level `name` on **v0**; Cursor rejects unrecognized keys |
| Fix PR | [#498](https://github.com/CzechowskiT/twin/pull/498) `fix/dispatcher-v0-omit-name-contract` → merge `c5df0963…` |
| Guard | `test_cursor_v0_create_omits_name_key` |

## Live canary (Phase 3) + lock (Phase 4)

| Stage | Result |
|-------|--------|
| MCP `dispatch_twin_agent` (read-only) | run `83782f7a-…` → Cursor `bc-df1704b3-…` → **succeeded** |
| Report / handoff via MCP | **PASS** |
| Parallel second dispatch | MCP `isError` with **HTTP 409** `active_run_lock` (lock held by canary run); no second Cursor agent |
| Lock after completion | `active_lock_count=0` |
| GitHub delta for canary | **zero** new branches/PRs (autoBranch name reported by Cursor was not persisted on GitHub) |

## Feature run (Phase 5–7)

| Stage | Result |
|-------|--------|
| MCP task | `dispatcher-runtime-contract-guard` |
| Dispatcher run | `e6871405-…` → Cursor `bc-56b06e60-…` → **succeeded** |
| Branch | `fix/dispatcher-runtime-contract-guard` |
| PR | [#499](https://github.com/CzechowskiT/twin/pull/499) · SHA `6fffd171588654aa0512b570200c728a83db9563` |
| CI | unit / backend-smoke / frontend-build / security-regression **PASS** |
| Merge | manual (draft→ready) · merge commit `760e96f4…` · no auto-merge / no force-push |
| Prod deploy | health SHA matched merge |

PR scope: v0 `name` already guarded; additional v1 `latestRunId` recovery (no v0 fallback on v1 poll/cancel); architecture + evidence docs; tests **21 passed** in agent run.

## Final regression (Phase 8)

| Check | Result |
|-------|--------|
| Dispatcher health | OK |
| MCP / Auth / Canary | OK |
| Webhook configured | true |
| Polling / reconcile | used live during canary + feature |
| GitHub enrichment | PR number present; SHA/CI skipped without GH token (verified via `gh`) |
| CLI `twin:agent:health` | OK |
| Lock | 0 |
| Non-terminal / orphaned runs | 0 |
| Active runs | 0 |

## Hard stance

- Gate F: **PASS**
- Platform Launch: **READY**
- P0 OPEN: none for this chain
- Phase 3B: not in scope of this batch

## Next recommended batch

Candidate Monetization / TWIN Career Agent (Premium, verified introductions, success-based reverse recruiting — no mass apply, no impersonation).
