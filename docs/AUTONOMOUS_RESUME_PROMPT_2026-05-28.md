# Autonomous Resume Prompt — 2026-05-28

Use this exact prompt to continue safely from the latest checkpoint:

```text
Continue TRUE 12-HOUR AUTONOMOUS WORK MODE for TWIN on branch cursor/phase1-monorepo-scaffold.

Rules:
- Never stop while safe queue work remains.
- If queue ends, generate next queue and continue.
- Do NOT produce final 12h report unless explicitly requested.
- Hard bans: no real apply, no auto-apply/scrape, no prod migration/deploy/env changes, no CSP enforce flip, no secrets handling, no force push.

Immediate steps:
1) Read docs/AUTONOMOUS_WORKLOG_2026-05-28.md and continue from latest entry.
2) Read docs/AUTONOMOUS_TASK_QUEUE_2026-05-28.md and pick next READY item by dependency order.
3) Execute one small safe slice: implement -> targeted tests -> commit -> push -> update worklog + queue.
4) Re-check Actions for branch and run read-only production checks (/api/public-health, /status, /, /waitlist, /demo, /login/candidate, /dashboard).
5) Repeat loop without stopping while safe tasks remain.
```

## Current Resume Anchor

- System doc: `docs/AUTONOMOUS_ENGINEER_SYSTEM_2026-05-28.md`
- Queue doc: `docs/AUTONOMOUS_TASK_QUEUE_2026-05-28.md`
- Worklog doc: `docs/AUTONOMOUS_WORKLOG_2026-05-28.md`
- Finalization gate: `docs/AUTONOMOUS_FINALIZATION_GATE_2026-05-28.md`
