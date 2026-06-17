# Team Collaboration Layer — 2026-06-17

**Branch:** `product/team-collaboration-layer-2026-06-17`  
**Routes:** team workspace + tasks alias (recruiter + company)

## Purpose

Recruiter/company-facing **team collaboration system-of-record layer** connected to Candidate Profile 360, Job Pipeline, Notes/Feedback/Scorecards, GDPR/Trust, and Decision Memory — shared workspace with activity timeline, assignments, follow-up tasks, open questions, decision checklist, collaboration boundary, and audit connections. **Pilot/sample only** for `demo-candidate-001` and `demo-role-001`; invalid IDs render meaningful not-found (not Next 404 shell).

## Page sections (8)

| # | Section | Status |
| - | ------- | ------ |
| 1 | Header — candidate/role, pipeline stage, collaboration status, decision owner, links to profile/pipeline/notes/trust, pilot badge | Pilot sample |
| 2 | Team activity timeline — deterministic demo events (reviewed, feedback requested, scorecard drafted, consent review, shortlist, task created, digest, decision pending) — no fake outbound | Pilot sample |
| 3 | Assignments/ownership — decision/reviewer/consent/recruiter/HM/task owners — reassign disabled/demo-only | Demo-only |
| 4 | Follow-up tasks — demo tasks with priority, due, owner, status, linked surface — actions disabled | Demo-only |
| 5 | Open questions / missing evidence | Pilot sample |
| 6 | Decision checklist — profile/consent/scorecard/feedback/risks/communication/human decision — no auto decision | Pilot sample |
| 7 | Collaboration boundary copy — human decision required | Live copy |
| 8 | Audit connections to Profile 360, Notes, Trust, Pipeline, Digest, Decision Memory | Pilot sample |

## Routes

### Recruiter (candidate)

- `/recruiter/candidates/demo-candidate-001/team` (primary shared workspace)

### Recruiter (job)

- `/recruiter/jobs/demo-role-001/team`
- `/recruiter/jobs/demo-role-001/tasks` (alias — tasks focus)

### Company

- `/company/candidates/demo-candidate-001/team`
- `/company/roles/demo-role-001/team`
- `/company/roles/demo-role-001/tasks`

## Data boundary

- **Demo:** `frontend/src/lib/team-collaboration-demo-data.ts` — deterministic, no real PII, no network, no backend writes.
- **Live:** Not wired — `resolveCandidateTeamCollaboration()` / `resolveJobTeamCollaboration()` return demo record only for sample IDs.

## Link integration

- **Candidate Profile 360** — activity section → team route (`candidate-profile-360-team-link`).
- **Job Pipeline** — decision memory → team + tasks routes.
- **Collaboration** — decision memory audit → team route.
- **Trust** — audit connections → team route.
- **`/demo` journey** — `team_collaboration` step → `/recruiter/candidates/demo-candidate-001/team`.
- **Safe communication (2026-06-17)** — prepare communication draft task → communication/drafts; see `docs/SAFE_EMAIL_COMMUNICATION_LAYER_2026-06-17.md`.
- **ATS import readiness (2026-06-17)** — talent pool CSV path links to import readiness mapping; see `docs/ATS_IMPORT_CONNECTOR_READINESS_2026-06-17.md`.

## Copy constraints

Never use: "message sent", "email sent", "automatic outreach", "automatic application", "auto-rejected", "AI decided", "GDPR compliant", "legally compliant".

Use: demo-only, planned, requires review, human decision required, not live, AI-assisted summary, audit context.

## Hard bans (preserved)

- No changes to `LightweightRouteShell`, `PersonaWorkspaceGate`, `WorkspaceRouteLayout`, dashboard layouts, route fallback.
- No auth weakening; no auto-apply / outreach / calendar sync / ATS activation.
- Launch stance **NO-GO** unchanged; P0 performance **OPEN** unchanged.

## Tests

```bash
cd frontend
npm run test:team-collaboration-layer
PLAYWRIGHT_ENABLE_BROWSER_TESTS=1 PLAYWRIGHT_ENABLE_WEBSERVER=1 npm run test:team-collaboration-layer-browser
```

## Constants

- `frontend/src/lib/team-collaboration.ts`
- `frontend/src/components/recruiter/team-collaboration-workspace.tsx`

## Polish report (20 sections)

1. **Mission** — Team collaboration system-of-record layer for recruiter/company hiring teams; connects Profile 360, Pipeline, Notes, Trust, Decision Memory.
2. **Scope** — Pilot sample only (`demo-candidate-001`, `demo-role-001`); no backend writes; no PII.
3. **Routes delivered** — 6 routes (candidate team, job team, job tasks × recruiter + company aliases).
4. **Page sections** — 8 sections per spec: header, timeline, assignments, tasks, questions, checklist, boundary, audit.
5. **Demo data** — `team-collaboration-demo-data.ts` with deterministic events, assignments, tasks, checklist.
6. **Components** — `CandidateTeamCollaborationWorkspace`, `JobTeamCollaborationWorkspace`; tasks view scrolls to follow-up section.
7. **i18n** — `teamCollaboration.*` namespace EN + PL; no user-facing literals outside `i18n.ts`.
8. **Invalid IDs** — `GuidedEmptyState` via `TEAM_COLLABORATION_MARKERS.notFound`; HTTP 200, not Next 404.
9. **Disabled actions** — Reassign and task update buttons disabled with demo-only hints.
10. **Link integration** — Profile 360 activity, pipeline decision memory, collaboration audit, trust audit → team routes.
11. **Demo journey** — `team_collaboration` step in `founder-led-demo-routes.ts`.
12. **Hard bans preserved** — No shell/gate/layout changes; auth/tests unchanged; launch NO-GO unchanged.
13. **Forbidden copy** — Static test #17 guards against banned phrases in workspace source.
14. **Static tests** — `test:team-collaboration-layer` — 18 assertions.
15. **Browser tests** — `test:team-collaboration-layer-browser` — 3 specs, workers=1.
16. **Regression suite** — All required P0 + layer tests + build + tsc must pass before merge.
17. **Docs** — This file + matrix updates in `PRODUCTION_REALITY_MATRIX`, `PUBLIC_LAUNCH_READINESS_MATRIX`, related layer docs.
18. **CI gate** — PR to `cursor/phase1-monorepo-scaffold`; CI green before merge.
19. **Deploy gate** — Merge → Vercel deploy → prod smoke with `PLAYWRIGHT_ALLOW_PROD_SMOKE=1`.
20. **Phase 3B** — **BLOCKED** unchanged; P0 performance **OPEN**; no auto-apply/outreach/calendar activation.
