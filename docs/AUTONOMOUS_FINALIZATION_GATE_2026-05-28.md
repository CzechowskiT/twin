# Autonomous Finalization Gate — 2026-05-28

Final report generation is blocked unless all conditions are met:

1. User explicitly requests finalization.
2. Queue has no safe `READY` work remaining.
3. Latest session checkpoint includes:
   - cumulative task count
   - HEAD SHA
   - commits pushed
   - tests run and results
   - CI state
   - production read-only SHA/status signal
4. All hard bans remained respected.

## Non-Final Checkpoint Template

Use this instead of final report:

- Wall-clock progress
- Updated cumulative micro-task count
- HEAD
- Commits pushed
- Tests run/results
- Actions status
- Production SHA status
- Gates improved
- Next queue
- Explicit reason final report is not produced yet
- Resume prompt path

## Hard Stop Triggers (Require User Decision)

- Unexpected destructive git requirement
- Credential/auth blocker requiring manual action
- External system outage preventing safe verification
- Conflicting instructions that violate hard bans
