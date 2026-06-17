# Job-Specific Pipeline + Process Statuses — 2026-06-17

**Branch:** `product/job-specific-pipeline-statuses-2026-06-17`  
**Routes:** `/recruiter/jobs/[jobId]` · `/recruiter/jobs/[jobId]/pipeline` · `/company/roles/[roleId]` (demo) · `/company/roles/[roleId]/pipeline` (alias)

## Purpose

Recruiter/company-facing **system-of-record direction** for one job role — seven visually distinct pipeline stages, candidate cards with fit/consent/trust, disabled stage actions, decision memory audit panel, and explicit human decisioning boundaries. **Pilot/sample only** for `demo-role-001`; invalid IDs render meaningful not-found (not Next 404 shell).

## Page sections

| # | Section | Status |
| - | ------- | ------ |
| 1 | Job header — title, dept, location, priority, seniority, health, count, back link, pilot badge | Pilot sample |
| 2 | Pipeline board — 7 columns (New → Nurture) with candidate cards | Pilot sample |
| 3 | Candidate cards — name, fit, score, consent/trust, activity, rationale, Profile 360 CTA | Pilot sample |
| 4 | Stage actions — disabled/planned (Move to review, Shortlist, Snooze, Dismiss, Request feedback) | Demo only |
| 5 | Decision memory — deterministic audit events | Pilot sample |
| 6 | Human decisioning boundary — no auto apply/outreach/ATS writes | Live copy |
| 7 | Invalid jobId — guided not-found with back links | Live |

## Data boundary

- **Demo:** `frontend/src/lib/job-pipeline-demo-data.ts` — `demo-role-001`, 8 sample candidates, deterministic, no real PII.
- **Profile 360 link:** `demo-candidate-001` → `/recruiter/candidates/demo-candidate-001` (connected); other IDs show guided not-connected copy.
- **Live:** Not wired — `resolveJobPipeline()` returns demo record only for sample ID; all other IDs → guided not-found.
- **No backend mutation** on stage actions.

## Link integration

- Recruiter Jobs — demo pipeline link (`data-testid=recruiter-jobs-demo-pipeline-link`).
- Company Roles — demo pipeline link (`data-testid=company-roles-demo-pipeline-link`).
- Talent Radar — pipeline link next to Profile 360 (`data-testid=recruiter-talent-radar-job-pipeline-link`).
- `/demo` journey — `job_pipeline` step → `/recruiter/jobs/demo-role-001/pipeline` (auth-gated).

## Hard bans (preserved)

- No changes to `LightweightRouteShell`, `PersonaWorkspaceGate`, `WorkspaceRouteLayout`, dashboard layouts, route fallback.
- No auth weakening; no auto-apply / outreach / calendar sync / ATS activation.
- Launch stance **NO-GO** unchanged; P0 performance **OPEN** unchanged.

## Tests

```bash
cd frontend
npm run test:job-specific-pipeline-statuses
PLAYWRIGHT_ENABLE_BROWSER_TESTS=1 PLAYWRIGHT_ENABLE_WEBSERVER=1 npm run test:job-specific-pipeline-statuses-browser
```

## Constants

- `frontend/src/lib/job-pipeline.ts`
- `frontend/src/lib/job-pipeline-demo-data.ts`
- `frontend/src/components/recruiter/job-pipeline-workspace.tsx`
