# Autonomous Engineer System — 2026-05-28

## Purpose

Create a durable, resumable operating system for long-running autonomous engineering sessions on `cursor/phase1-monorepo-scaffold` that can continue safely without losing context.

## Session Contract

- Never stop while safe, queue-backed work remains.
- Never execute hard-ban actions (real apply, scraping/auto-apply, prod migration/deploy/env mutations, CSP enforce flip, secrets handling, force push).
- Keep every slice small, testable, reversible, and documented.
- Commit and push per coherent slice.
- Maintain up-to-date worklog and resume prompt after each major checkpoint.

## Execution Loop

1. Load branch and sync from origin (`fetch`, `ff-only pull`).
2. Run queue dispatch:
   - pick next `READY` item
   - validate dependencies and risk
   - execute minimal safe change
   - run targeted verification
   - commit and push
   - update worklog + queue status
3. Re-check CI and production read-only health surfaces.
4. Repeat until queue exhaustion.
5. If queue exhausted, run backlog factory and continue.

## Risk Tiers

- `LOW`: docs/tests/read-only checks/refactors without runtime behavior changes.
- `MEDIUM`: isolated backend/frontend behavior changes behind existing patterns.
- `HIGH`: architecture-changing slices requiring explicit gate checks; avoid in autonomous mode unless pre-approved.

## Required Slice Metadata

Each queue task must include:

- `ID`
- `Category`
- `Title`
- `Risk`
- `Status` (`READY`, `BLOCKED`, `DONE`, `IN_PROGRESS`)
- `Dependencies`
- `Verification`
- `Expected Commit Scope`

## Quality Gates Per Slice

- Targeted tests executed and recorded.
- No secrets introduced.
- No hard-ban operations triggered.
- Worklog entry appended with objective evidence.
- Push outcome recorded.

## CI and Runtime Monitoring Policy

- Prefer GitHub Actions status for branch feedback.
- Keep production checks read-only (`/api/public-health`, `/status`, key public pages).
- Treat production SHA drift as operational signal; document but do not mutate production from this loop.

## Exit Criteria (Session-Level)

Session may checkpoint only when:

- At least one coherent slice is merged into branch via commit+push, or
- Explicit blocker documented with evidence and proposed unblocking steps.

Final 12-hour report is prohibited until user explicitly requests finalization.
