# ADR: TWIN Executive AI v1 — architecture and safe autonomy

**Status:** PROPOSED — NOT DEPLOYED — NO LIVE CONNECTORS  
**Date:** 2026-11-09  
**Decision:** Extend existing TWIN rather than launch a separate privileged agent platform.

## Purpose

One authenticated, durable interface for the Founder to **delegate outcomes** and receive auditable results. Deterministic automation performs a defined sequence; agentic work selects steps when judgment is required. The two must not be confused.

Leadership presentation principles:

- Automation: repeatable fixed steps, e.g. morning brief, meeting brief, scheduled reports.
- Agent: strategy critique, research and sales prioritization with independent planning.
- Three autonomy questions: risk, reversibility, verifiability. **One red flag disables autonomy**.
- Delegate execution, retain human responsibility.

## Architecture

```text
Founder (ChatGPT / TWIN web interface / optional authenticated messaging)
  -> authenticated intent API (identity, tenant, scopes, budget)
  -> TWIN Founder Command orchestrator (durable jobs, limits, cancellation)
      -> deterministic workers (Celery / optional n8n)
      -> specialized agents (bounded tool loops + source verification)
      -> approval inbox (human sign-off for consequential actions)
  -> server-side tool gateway (per-call policy, OAuth, allowlist, audit)
      -> FP tenant / RA tenant / personal tenant / TWIN code tenant
  -> isolated memory, indexes and audit per tenant
  -> approved model router (cloud or local) and actual connector tools
```

Existing elements to reuse: FastAPI; Postgres/SQLAlchemy; Celery/Redis; Next.js; `founder_command`; `agent_dispatch` (Cursor/GitHub); `chatgpt_twin`.

## Specialist agents

| Agent | Allowed mission | Initial activation |
|---|---|---|
| Executive Assistant | Inbox classification, meeting preparation, drafts | Draft/read-only |
| Global Sales | Authorized FP pipeline review and account research | Read-only |
| RealAdvisor Sales | Authorized Close pipeline diagnostics and coaching | Read-only |
| Research | Public research with independently checkable sources | Read-only |
| Development | Delegate code changes to Cursor and inspect GitHub PRs | PR review; no merge/deploy |
| Operations | Repeatable reports, checks, alerts, scheduled jobs | Dry-run then opt-in |

Do **not** copy one corporation's mail, CRM, documents, embeddings, or prompts into the other corporation's tenant or personal workspace. Connectors, storage, caches, audit and tokens need real back-end isolation. ChatGPT's connected plugins do not automatically grant the separate TWIN service an OAuth/API scope.

## Decision policy

- AUTO only for low risk, easily reversible, easily verifiable, zero incremental spend and no external write.
- APPROVAL for nonzero or unknown cost, email/Slack sends, meeting changes, CRM writes, sharing, deploys, financial or people decisions, medium/high risk, hard-to-reverse actions or uncertain verification.
- BLOCK for missing operation, mismatched tool/owner domain, cross-domain transfer and malformed cost.
- A preapproved budget/policy may be supported in later versions, with exact amount, vendor, domain, time and allowed operations. **Not implemented here.**
- Retrieved pages, email content and model responses are untrusted data and must not change tool permissions or approval decisions.

Every proposed tool call must be checked by the server, not only by the model. The v1 policy is a pure function and is **not yet wired to any API route**.

## End-to-end control loop

1. Validate owner identity, domain and intended result.
2. Classify automation vs agent; choose bounded specialist.
3. Plan actions with cost and verification evidence.
4. Independently authorize every tool call.
5. Execute using scoped credentials, idempotency and retry limits.
6. Verify actual receipts, diffs or API status; never claim success from a plan.
7. Record redacted audit with approval decision and incremental cost.
8. Return completed, pending approval, blocked or failed with source links.

Add limits for max steps, token/cost allowance, timeout, run concurrency, retries, monitoring, kill switch and per-tenant retention. Never start paid infrastructure or API usage without prior Founder approval.

## Rollout gates

1. **G0 Security** — Preview API/DB isolated from production; operator authentication + CSRF/RBAC verified; secrets not leaked client-side; clean environment and backups.
2. **G1 Read-only** — one approved domain, authenticated connector, draft-only output, evidence + audit.
3. **G2 Deterministic** — scheduled briefs, reports and meeting checks, idempotency and holiday calendars.
4. **G3 Agentic** — bounded research and pipeline analysis, citations, tenant memory, review inbox, cost dashboard.
5. **G4 Delegated action** — narrowly approved low-risk tool permissions and auditable external effects. Money, employment, sharing and irreversible changes remain human decisions.

## Security concerns observed in existing repo

- Current `founder_command/approval_policy.py` may auto-approve certain standard production deploys when CI evidence exists. Executive Agent must **not inherit** that privilege.
- Open PR #543 explicitly documents Preview to production API isolation blockers. Resolve before exposing live data or new write connectors.
- Do not merge or deploy this PR, create paid services or change existing credentials without Founder authorization.

## Deliverable in this PR

A **pure Python execution-governance module**, unit tests and this ADR. No HTTP routes, outbound calls, new subscriptions, live credentials, scheduled tasks, data ingestion or production deployment. It is groundwork for an implementation, **not an already-running agent**.

## Required negative tests before live release

Cross-tenant RAG; malicious email prompt injections; stale/forged approvals; webhook replay; duplicate requests; unknown or exceeded budget; unapproved mail/send/calendar/CRM/deploy actions; source verification errors; worker retries and kill-switch behavior.
