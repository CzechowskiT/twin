# Scheduling Proposal Pack — 2026-06-25

Read-only cross-surface layer assembling offer readiness, placement verification, calendar readiness, and scheduling decision context into a demo-only scheduling proposal preview.

## Status

| Item | Status |
|------|--------|
| Live scheduling | **NOT SHIPPED** |
| Calendar sync / event write | **BLOCKED** |
| Invite / email / notification | **BLOCKED** |
| Microsoft Graph live busy-read | **NOT SHIPPED** (staging smoke blocked) |
| Public launch | **NO-GO** |
| P0 performance | **OPEN** |
| Phase 3B | **HARD BLOCKED** |

## Purpose

Help candidate, recruiter, company, and board users understand:

- what scheduling proposal would be reasonable (demo window only),
- what evidence supports it,
- what is blocked,
- what human review is required,
- why no automatic calendar action has happened.

This is **not** live scheduling, Microsoft Graph live, event creation, invite sending, email, calendar sync, or ATS writeback.

## Routes

| Route | Persona |
|-------|---------|
| `/dashboard/scheduling-proposal` | Candidate |
| `/profile/scheduling-proposal` | Candidate (profile alias) |
| `/recruiter/scheduling-proposal` | Recruiter |
| `/company/scheduling-proposal` | Company |
| `/board/scheduling-proposal` | Board |

## Persona coverage

Each persona receives a deterministic demo bundle with persona-specific status and subtitle copy. All personas share the same readiness signals, blocked actions, human review checklist, and audit trail structure.

## Safety boundaries

- No event write
- No invite sent
- No email sent
- No calendar sync
- No ATS writeback
- No automatic acceptance
- Human review required before any live action
- Product gate required for calendar integration

## Demo-only / read-only nature

All data comes from `scheduling-proposal-demo-data.ts` with `source: readiness_preview`. No backend writes, no external API calls, no OAuth connect flows on these routes.

## Relationship to Microsoft busy-read staging

Microsoft busy-read appears as a **blocked** readiness signal (`staging smoke required`). Live Graph gates remain OFF on production. This pack does not wait for staging URL/JWT — it surfaces the gate honestly.

## Cross-links

Inbound links added (minimal) from:

- Offer readiness (candidate)
- Scheduling decision context panel
- Board offer readiness monitor
- Board calendar readiness monitor

Outbound cross-links from each persona route to offer readiness, placement verification, calendar readiness, trust/cockpit, and board scheduling proposal.

## Tests

```bash
cd frontend
npm run test:scheduling-proposal
```

Optional browser smoke:

```bash
PLAYWRIGHT_ENABLE_BROWSER_TESTS=1 PLAYWRIGHT_ENABLE_WEBSERVER=1 npm run test:scheduling-proposal-browser
```

## Files

- `frontend/src/lib/scheduling-proposal.ts`
- `frontend/src/lib/scheduling-proposal-demo-data.ts`
- `frontend/src/components/scheduling-proposal/SchedulingProposalPanel.tsx`
- `frontend/scripts/scheduling-proposal.test.ts`
