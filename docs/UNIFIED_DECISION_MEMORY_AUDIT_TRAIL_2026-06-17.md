# Unified Decision Memory / Audit Trail — 2026-06-17

Executive audit cockpit for recruiter and company personas: deterministic decision timeline, evidence bundle, blockers, next actions, and human decisioning boundary.

## Scope (pilot)

- **Routes:** `/recruiter/candidates/demo-candidate-001/decision-memory`, `/company/candidates/demo-candidate-001/decision-memory`
- **Optional job-level:** `/recruiter/jobs/demo-role-001/decision-memory`, `/company/roles/demo-role-001/decision-memory`
- **Demo IDs:** `demo-candidate-001`, `demo-role-001`
- **No backend writes**, no ATS sync, no email send, no calendar scheduling (not live)

## Page sections (8)

1. **Header** — candidate, role, pipeline stage, decision status, owner, last event, cross-module links, pilot badge
2. **Decision timeline** — 11 deterministic events (import → decision pending); no final hiring decision
3. **Evidence bundle** — categories with reviewed/pending/requires review/blocked status
4. **Decision state** — New / Under review / Shortlisted / Hold / Rejected / Nurture / Offer pending / Decision pending; demo: *Shortlisted — human decision pending*
5. **Blockers & risks** — consent, notice period, compensation gaps
6. **Next action checklist** — recruiter-owned steps; calendar marked not live
7. **Audit integrity** — read-only, deterministic, no sync/writeback/emails
8. **Human decisioning boundary** — AI-assisted summary only; recruiter owns decisions

## Files

| Layer | Path |
|-------|------|
| Lib | `frontend/src/lib/decision-memory.ts` |
| Demo data | `frontend/src/lib/decision-memory-demo-data.ts` |
| Workspace | `frontend/src/components/recruiter/decision-memory-workspace.tsx` |
| Static test | `frontend/scripts/unified-decision-memory-audit-trail.test.ts` (19 assertions) |
| Browser test | `frontend/e2e/unified-decision-memory-audit-trail-browser.spec.ts` (19 tests) |

## Link integration

Safe links **from** existing modules **to** decision memory:

- Profile 360 (`candidate-profile-360-decision-memory-link`)
- Job pipeline (`job-pipeline-decision-memory-audit-link`)
- Notes / collaboration (`candidate-collaboration-decision-memory-link`)
- Trust (`candidate-trust-decision-memory-link`)
- Team collaboration (`team-collaboration-decision-memory-link`)
- Safe communication (`safe-communication-decision-memory-link`)
- ATS import readiness (`ats-import-readiness-decision-memory-link`)
- System-of-record hub (`recruiter_demo_decision_memory`, `company_demo_decision_memory`)
- Founder-led demo journey (`decision_memory` step)

## Forbidden copy

Do **not** use: email sent, message sent, automatic outreach, automatic application, auto-rejected, AI decided, GDPR compliant, legally compliant, ATS sync completed, writeback completed, calendar scheduled.

Use: demo-only, pilot, requires review, human decision required, not live, AI-assisted summary, audit context, no automatic outreach, no ATS writeback, no email sent.

## Tests

```bash
cd frontend
npm run test:unified-decision-memory-audit-trail
PLAYWRIGHT_ENABLE_BROWSER_TESTS=1 PLAYWRIGHT_ENABLE_WEBSERVER=1 npm run test:unified-decision-memory-audit-trail-browser
```

Prod smoke (after deploy):

```bash
PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app npm run test:unified-decision-memory-audit-trail-browser
```

## Hard bans (unchanged)

- No Phase 3B / controlled multitab / headless stress
- Do not touch `LightweightRouteShell`, `PersonaWorkspaceGate`, `WorkspaceLayout`, `WorkspaceRouteLayout`, dashboard layouts, route fallback logic
- Do not mark P0 DONE or change launch NO-GO
- Do not activate auto-apply, outreach, calendar sync, live ATS, or email send
