# Hiring Journey Timeline — 2026-06-25

Read-only cross-surface layer connecting Candidate Profile 360, Trust Center, Offer Readiness, Scheduling Proposal Pack, Calendar Readiness and Placement Verification into a unified eleven-step hiring workflow preview.

## Status

| Item | Status |
|------|--------|
| Live workflow engine | **NOT SHIPPED** |
| Candidate advancement | **BLOCKED** |
| Interview scheduling / event write | **BLOCKED** |
| Invite / email / notification | **BLOCKED** |
| Calendar sync | **BLOCKED** |
| ATS writeback | **BLOCKED** |
| Payment / revenue recognition | **BLOCKED** |
| Microsoft Graph live busy-read | **NOT SHIPPED** (staging smoke blocked) |
| Public launch | **NO-GO** |
| P0 performance | **OPEN** |
| Phase 3B | **HARD BLOCKED** |

## Purpose

Help candidate, recruiter, company and board users see the full hiring process as one coherent timeline with:

- step status, owner and source module,
- evidence summary and blockers,
- next safe action and safety boundary,
- links to existing readiness surfaces.

This is **not** a workflow engine. It does not advance candidates, mutate state, create interviews, send invites or email, sync calendars, write to ATS or recognize revenue.

## Routes

| Route | Persona |
|-------|---------|
| `/dashboard/hiring-journey` | Candidate |
| `/profile/hiring-journey` | Candidate (profile alias) |
| `/recruiter/hiring-journey` | Recruiter |
| `/company/hiring-journey` | Company |
| `/board/hiring-journey` | Board |

## Persona coverage

Each persona receives a deterministic demo bundle with persona-specific overall status, subtitle copy and step hrefs. All personas share the same eleven-step structure, blocked actions and audit summary.

## Timeline steps

1. Discovery
2. Matching
3. Trust Review
4. Candidate Readiness (Profile 360)
5. Offer Readiness
6. Scheduling Proposal
7. Interview Preparation (Calendar Readiness)
8. Decision Review (Scheduling Decision Context)
9. Offer Decision
10. Placement Verification
11. Onboarding / Next Step Preview

## Source modules connected

- Job discovery / matches
- Candidate Trust Center
- Candidate Profile 360
- Offer Readiness
- Scheduling Proposal Pack
- Calendar Readiness
- Scheduling Decision Context
- Placement Verification
- Board evidence monitors

## Safety boundaries

- No automatic candidate advancement
- No interview scheduled
- No invite sent
- No email sent
- No calendar sync
- No ATS writeback
- No payment / invoice / revenue recognition
- No external employer confirmation
- Human review required before any live action

## Demo / readiness-only nature

All data comes from `hiring-journey-demo-data.ts` with `source: readiness_preview`. No backend writes, no external API calls, no OAuth connect flows on these routes.

## Relationship to Scheduling Proposal Pack

Scheduling Proposal is step 6 in the journey. The journey surfaces the same blocked calendar/invite/email boundaries as PR #290 Scheduling Proposal Pack, with outbound links to the proposal routes per persona.

## Relationship to Microsoft busy-read staging blocker

Interview Preparation (step 7) shows Microsoft Graph live busy-read as blocked with staging smoke required. Live Graph gates remain OFF on production. The journey does not wait for staging URL/JWT — it surfaces the gate honestly.

## Cross-links

Inbound links added (minimal) from:

- Scheduling Proposal Pack
- Scheduling Decision Context
- Offer Readiness (candidate)
- Placement Verification evidence panel
- Board offer readiness monitor
- Board calendar readiness monitor
- Board placement evidence monitor

Outbound cross-links from each persona route to Profile 360, Trust, Offer Readiness, Scheduling Proposal, Calendar Readiness, Placement Verification and board hiring journey.

## Tests

```bash
cd frontend
npm run test:hiring-journey
```

Optional browser smoke:

```bash
PLAYWRIGHT_ENABLE_BROWSER_TESTS=1 PLAYWRIGHT_ENABLE_WEBSERVER=1 npm run test:hiring-journey-browser
```

Prod smoke (after deploy):

```bash
PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app npm run test:hiring-journey-browser
```
