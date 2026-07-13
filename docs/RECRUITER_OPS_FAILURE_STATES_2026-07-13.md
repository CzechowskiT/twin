# Recruiter ops failure states (2026-07-13)

> **Status:** CURRENT  
> **Modules:** C1 activation, C2 talent pool, C2 trust review  
> **Guard:** `npm run test:recruiter-ops-failure-states-guard`

---

## C1 — Activation (`/recruiter` hub panel)

| State | Trigger | UI |
|-------|---------|-----|
| Loading | Initial fetch | Skeleton |
| Empty | New company, no decisions | Steps checklist |
| In progress | Some steps done | Partial progress |
| Complete | `activation_complete` | Success badge |
| Error — auth | 401 token | Link to login / token help |
| Error — network | fetch failed | Retry button |
| Error — unknown company | invalid slug | Not-found message |

## C2 — Talent Pool (`/recruiter/talent-pool`)

| State | Trigger | UI |
|-------|---------|-----|
| Empty | No records | "Add candidate" CTA |
| Loaded | Records exist | Table with privacy-safe snapshots |
| Archived filter empty | All archived | Empty filter message |
| Error — cross-tenant | wrong slug | Empty (no data leak) |
| Error — save failed | 409/500 | Inline error, form preserved |

## C2 — Trust Review Queue (`/recruiter/trust-review-queue`)

| State | Trigger | UI |
|-------|---------|-----|
| Empty | No open privacy requests | "No pending reviews" |
| Synced | Items from Trust Center | Queue list |
| Decision recorded | POST success | Item moves to resolved |
| Error — IDOR | item_id other company | 404 treated as removed |

## PILOT honesty

All C1/C2 modules remain **PILOT** until `FOUNDER_SMOKE: PASS` in recruiter smoke runbook.

## Hard bans

- No fake "live" or "production-ready" copy on failure states
- No auto-retry with delegated credentials
