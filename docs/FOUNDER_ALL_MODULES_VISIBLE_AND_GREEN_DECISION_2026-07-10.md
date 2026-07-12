# Founder decision — all modules visible and green (2026-07-10)

> **Supersedes:** green-only visibility strategy (Wave 1–3, PRs #434–#443). Historical docs retained with superseded notes.

## Decision

Previous **green-only visibility** strategy was **WRONG**. New rule:

1. **ALL** target product modules visible in appropriate workspace hubs.
2. **Honest statuses:** LIVE / PILOT / PREVIEW / COMING SOON / PAUSED / INTERNAL.
3. Develop modules **one-by-one** to real **GREEN_WORKING**.
4. **Launch NO-GO** until ALL modules are green and functional.
5. Do **NOT** declare Launch GO or Gate F YES.

## Stance (locked)

| Gate | Status |
|------|--------|
| P0 | **CLOSED** |
| Gate E | **PASS** |
| Gate F | **PENDING** |
| Launch | **NO-GO** |

## Visibility rules

- Workspace hubs show **full product surface** in sections: Core (LIVE), Extended, Pilot/Preview, Coming Soon/Paused.
- `/investor/roadmap` is **additional context** — not sole visibility for modules.
- Deep links and SoR routes **preserved**.
- INTERNAL: admin, security-sensitive (auto-apply, revoke/delete, billing preview).

## Restored from roadmap-only hiding

| Workspace | Restored modules |
|-----------|------------------|
| Candidate | Trust Center + all trust subflows |
| Recruiter | Integrations, Talent Pool, Talent Radar, Cockpit, Trust Review, Collaboration demos |
| Company | Integrations, Team, Talent Pool, Hiring Cockpit, Command Center |
| Investor | Login, Data Room, Placement, Proof modules, Readiness/board modules |

## Activation model

- Source: `frontend/src/lib/all-workspace-modules-activation.ts`
- Guards: `test:all-workspace-modules-visible-guard`, `test:all-workspace-modules-activation-plan-guard`
- Master plan: `docs/ALL_WORKSPACE_MODULES_ACTIVATION_MASTER_PLAN_2026-07-10.md`

## First implementation slice (plan only)

**Candidate Career Compass — full persistence** (Wave B slice 1). Not in this PR's code activation.

**Excluded from first slice:** auto-apply, delegated apply, Stripe, ATS writeback, MS calendar.

## Superseded artifacts

- `WORKSPACE_GREEN_ONLY_MODE` → `false`
- `all-workspace-green-gate.ts` — historical audit constants only
- Wave 1/2A/2B/3 green guards — superseded, not deleted
- `product-surface-visibility-guard` — updated for activation model
