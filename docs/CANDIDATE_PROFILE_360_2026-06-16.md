# Candidate Profile 360 — 2026-06-16

**Branch:** `product/candidate-profile-360-2026-06-16`  
**Routes:** `/recruiter/candidates/[candidateId]` · `/company/candidates/[candidateId]` (alias)

## Purpose

Recruiter/company-facing **system-of-record direction** for one candidate — strengths, risks, CV/documents, applications, matches, notes placeholder, feedback placeholder, consent/GDPR, decision memory, activity timeline, and explicit human decisioning boundaries. **Pilot/sample only** for `demo-candidate-001`; invalid IDs render a meaningful not-found (not Next 404 shell).

## Page sections (11)

| # | Section | Status |
| - | ------- | ------ |
| 1 | Header — name, role fit, status, trust/consent, last activity, back CTA | Pilot sample |
| 2 | Profile summary — strengths, risks, AI draft (labelled) | Pilot sample |
| 3 | CV/documents — status, experience, skills, evidence links (no fake downloads) | Pilot sample |
| 4 | Applications/roles — pipeline, match scores, no fake decisions | Pilot sample |
| 5 | Matches — cards, why matched, missing info, recruiter decision required | Pilot sample |
| 6 | Notes — empty state; no write (no safe API) | Placeholder |
| 7 | Feedback/scorecards — planned badge | Placeholder |
| 8 | Consent/GDPR — status, source, last contact, allowed use | Pilot sample |
| 9 | Decision memory — shortlist/snooze/dismiss/draft audit timeline | Pilot sample |
| 10 | Activity timeline — imported/matched/reviewed/digest events | Pilot sample |
| 11 | Human decisioning boundary — no auto apply/outreach | Live copy |

## Data boundary

- **Demo:** `frontend/src/lib/candidate-profile-360-demo-data.ts` — `demo-candidate-001`, deterministic, no real PII.
- **Live:** Not wired — `resolveCandidateProfile360()` returns demo record only for sample ID; all other IDs → guided not-found.
- **Candidate routes unchanged:** `/profile`, `/dashboard/profile`, `/dashboard/cv`.

## Link integration

- Talent Radar hero — sample Profile 360 link (`data-testid=recruiter-talent-radar-profile-360-link`).
- Talent Radar candidate cards — `Open Profile 360` tertiary CTA.
- `/demo` journey — `recruiter_profile_360` step → `/recruiter/candidates/demo-candidate-001` (auth-gated).
- Job pipeline (2026-06-17) — `demo-candidate-001` on `demo-role-001` shortlist links back to Profile 360.

## Hard bans (preserved)

- No changes to `LightweightRouteShell`, `PersonaWorkspaceGate`, `WorkspaceRouteLayout`, dashboard layouts, route fallback.
- No auth weakening; no auto-apply / outreach / calendar sync / ATS activation.
- Launch stance **NO-GO** unchanged; P0 performance **OPEN** unchanged.

## Tests

```bash
cd frontend
npm run test:candidate-profile-360
PLAYWRIGHT_ENABLE_BROWSER_TESTS=1 PLAYWRIGHT_ENABLE_WEBSERVER=1 npm run test:candidate-profile-360-browser
```

## Constants

- `frontend/src/lib/candidate-profile-360.ts`
- `frontend/src/components/recruiter/candidate-profile-360-workspace.tsx`
