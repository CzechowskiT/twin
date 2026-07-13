# Data lifecycle contract v3 — C3–C5 + hardening (2026-07-13)

> **Supersedes:** additive sections to `DATA_LIFECYCLE_CONTRACT_2026-07-13.md`  
> **Stance:** P0 CLOSED · Gate F PENDING · Launch **NO-GO**

## C3 — Notification preferences (#452)

| Aspect | Contract |
|--------|----------|
| Scope | Per-company recruiter in-app toggles |
| Retention | Until company workspace deleted |
| Deletion | CASCADE on company slug removal |
| External | **No** email/SMS/push — in-app only |

## C4 — Saved views (#453)

| Aspect | Contract |
|--------|----------|
| Scope | Filter JSON per recruiter + surface |
| Retention | Until explicit delete or workspace purge |
| PII | Filter values only — no candidate raw exports |

## C5 — Activity timeline (#454)

| Aspect | Contract |
|--------|----------|
| Scope | Read-only `recruiter_audit_events` |
| Retention | Append-only; 24-month pilot retention |
| Deletion | Anonymize actor on user delete |

## Candidate timeline (#455)

| Aspect | Contract |
|--------|----------|
| Scope | Trust audit read-only for `/me` |
| Retention | Same as trust center events |
| Export | Included in candidate GDPR export pipeline |

## Hardening tracks (#456–#460)

| Track | Migration | Lifecycle impact |
|-------|-----------|------------------|
| Pilot readiness dashboard | None | Read-only status constants |
| Workspace suspension | None | Policy doc only |
| Privacy request tracker | None | Trust Center remains SSOT |
| Feature flag audit | None | Observability metadata |
| Retention preview | None | Dry-run engine only |

**Guard:** `npm run test:data-lifecycle-contract-guard`
