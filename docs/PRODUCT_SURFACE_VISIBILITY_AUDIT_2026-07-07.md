# Product Surface Visibility Audit — 2026-07-07

**Canonical stance:** P0 CLOSED | Gate E PASS 20/20 | Gate F PENDING | **Launch NO-GO** | Controlled pilot possible

This slice changes **default hub visibility and grouping only**. Routes, deep links, and system-of-record entries remain intact. No business logic, backend, auth, or env changes.

## Why this improves perception

Pilot users previously saw a flat grid mixing live core flows with paused billing, ATS readiness, calendar sync, trust subflows, and demo cockpits — making the product feel unfinished. The controlled-pilot surface now shows a **small live primary grid** and collapses pilot/roadmap/hold modules behind an honest secondary section with PILOT / COMING SOON / PAUSED badges.

## Public / marketing (unchanged reachability)

| Route | Status |
|-------|--------|
| `/`, `/demo`, `/waitlist` | Keep |
| `/for-candidates`, `/for-companies`, `/for-recruiters` | Keep (honest copy) |
| `/faq`, `/privacy`, `/terms`, `/status` | Keep |

## Candidate — visible in pilot (primary hub)

- Dashboard panel, jobs, matches, profile, CV, applications, calendar, identity verification

## Candidate — pilot / roadmap (collapsed secondary)

- Trust center and subflows (control center, export preview, corrections, portability, audit export, consent receipt, overview)
- Career compass, interview prep, referrals, billing/plan, evidence lane
- Badges: PILOT / COMING SOON / PAUSED as appropriate

## Candidate — hidden from default hub (routes still exist)

- Auto-apply readiness strip (paused)
- Self-service revoke & delete preview

## Recruiter — visible in pilot (primary hub)

- Hub, inbox, pipeline, jobs, search

## Recruiter — pilot / roadmap (collapsed secondary)

- Daily cockpit, trust review queue, talent radar, talent pool, analytics, integrations, demo collaboration cards

## Recruiter — hidden from default hub

- Calendar sync (NOT LIVE)
- Operational work queue
- ATS import readiness (no live sync)

## Company — visible in pilot (primary hub)

- Dashboard, roles, pipeline, talent pool

## Company — pilot / roadmap (collapsed secondary)

- Hiring cockpit, hiring command center, team permissions, integrations, demo pipeline/profile cards

## Company — hidden from default hub

- Billing (NOT LIVE)
- ATS import readiness

## Always off default hubs (all personas)

| Module | Reason |
|--------|--------|
| Auto-apply | Paused — not live |
| Delegated apply | NOT LIVE — no submit on behalf |
| Recruiter calendar | NOT LIVE — sync not shipped |
| LinkedIn OAuth | Not configured on production surface |
| Self-service delete | Preview-only trust subflow |
| ATS live sync | Readiness/demo only — no writeback |
| Admin / board | Internal investor evidence — not end-user hub |

## Investor room

Investor and board routes stay in the investor system-of-record hub with existing grouped sections. This slice does not promote board/admin cards into candidate, recruiter, or company hubs.

## Implementation map

- `frontend/src/lib/product-surface-visibility.ts` — tier classification and hub split helpers
- `frontend/src/components/workspace/system-of-record-navigation-hub.tsx` — primary grid + collapsed roadmap section
- Workspace module registries aligned (`career_compass` → pilot; quick actions trimmed on recruiter hub)
- Static guard: `npm run test:product-surface-visibility-guard`

## Launch stance (explicit)

- **NOT Launch GO**
- **Gate F PENDING** — no Gate F YES in this slice
- **Public launch NO-GO** — controlled pilot only with honest surface boundaries
