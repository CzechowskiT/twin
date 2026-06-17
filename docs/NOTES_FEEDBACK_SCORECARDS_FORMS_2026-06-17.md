# Notes, Feedback, Scorecards & Forms — 2026-06-17

**Branch:** `product/notes-feedback-scorecards-2026-06-17`  
**Routes:** collaboration workspace + job-scoped feedback/scorecards (recruiter + company)

## Purpose

Recruiter/company-facing **collaboration layer** connected to Candidate Profile 360 and Job Pipeline — notes, hiring team feedback, nine-criteria scorecard, form previews, decision memory/audit, and explicit human decisioning boundaries. **Pilot/sample only** for `demo-candidate-001` and `demo-role-001`; invalid IDs render meaningful not-found (not Next 404 shell).

## Page sections (7)

| # | Section | Status |
| - | ------- | ------ |
| 1 | Header — candidate/role, pipeline stage, profile/pipeline links, trust badge, pilot badge | Pilot sample |
| 2 | Recruiter notes — categories, visibility; Add note disabled/demo-only | Pilot sample (read-only) |
| 3 | Hiring team feedback — structured cards, recommendations (continue/hold/reject/needs evidence) | Pilot sample |
| 4 | Scorecard — 9 criteria with rating, evidence, missing info | Pilot sample |
| 5 | Forms preview — screening, interview feedback, HM review — non-editable | Planned/demo |
| 6 | Decision memory / audit — deterministic demo events | Pilot sample |
| 7 | Human decisioning boundary — no auto apply/outreach | Live copy |

## Routes

### Recruiter (candidate)

- `/recruiter/candidates/demo-candidate-001/collaboration` (primary)
- `/recruiter/candidates/demo-candidate-001/notes` (alias)
- `/recruiter/candidates/demo-candidate-001/feedback` (alias)
- `/recruiter/candidates/demo-candidate-001/scorecard` (alias)

### Recruiter (job)

- `/recruiter/jobs/demo-role-001/feedback`
- `/recruiter/jobs/demo-role-001/scorecards`

### Company

- `/company/candidates/demo-candidate-001/collaboration`
- `/company/candidates/demo-candidate-001/feedback`
- `/company/roles/demo-role-001/feedback`
- `/company/roles/demo-role-001/scorecards`

## Data boundary

- **Demo:** `frontend/src/lib/candidate-collaboration-demo-data.ts` — deterministic, no real PII, no network, no backend writes.
- **Live:** Not wired — `resolveCandidateCollaboration()` / `resolveJobCollaboration()` return demo record only for sample IDs.

## Link integration

- **Candidate Profile 360** — notes → collaboration; feedback → feedback/scorecard aliases.
- **Job Pipeline** — candidate cards → profile + feedback/scorecard; decision memory → job feedback/scorecards.
- **`/demo` journey** — `collaboration` step → `/recruiter/candidates/demo-candidate-001/collaboration`.
- **Trust layer (2026-06-17)** — collaboration trust badge → trust workspace; see `docs/GDPR_CONSENT_CONTACT_HISTORY_2026-06-17.md`.
- **Team collaboration (2026-06-17)** — collaboration decision memory → team workspace; see `docs/TEAM_COLLABORATION_LAYER_2026-06-17.md`.
- **Safe communication (2026-06-17)** — feedback request / decision memory → communication route; see `docs/SAFE_EMAIL_COMMUNICATION_LAYER_2026-06-17.md`.

## Hard bans (preserved)

- No changes to `LightweightRouteShell`, `PersonaWorkspaceGate`, `WorkspaceRouteLayout`, dashboard layouts, route fallback.
- No auth weakening; no auto-apply / outreach / calendar sync / ATS activation.
- Launch stance **NO-GO** unchanged; P0 performance **OPEN** unchanged.

## Tests

```bash
cd frontend
npm run test:notes-feedback-scorecards
PLAYWRIGHT_ENABLE_BROWSER_TESTS=1 PLAYWRIGHT_ENABLE_WEBSERVER=1 npm run test:notes-feedback-scorecards-browser
```

## Constants

- `frontend/src/lib/candidate-collaboration.ts`
- `frontend/src/components/recruiter/candidate-collaboration-workspace.tsx`
