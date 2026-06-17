# Safe Email Communication Layer — 2026-06-17

**Branch:** `product/safe-email-communication-layer-2026-06-17`  
**Routes:** communication workspace + drafts alias (recruiter + company)

## Purpose

Recruiter/company-facing **safe email communication draft-only layer** connected to Candidate Profile 360, Job Pipeline, Notes/Feedback/Scorecards, GDPR/Trust, Team Collaboration, and Decision Memory — draft library, preview, consent boundary, internal update card, communication audit, and human decisioning boundary. **Pilot/sample only** for `demo-candidate-001` and `demo-role-001`; invalid IDs render meaningful not-found (not Next 404 shell). **No real sending.**

## Page sections (8)

| # | Section | Status |
| - | ------- | ------ |
| 1 | Header — candidate/role, draft-only status, consent badge, decision owner, links profile/pipeline/team/trust, pilot badge | Pilot sample |
| 2 | Consent/contact warning — contact requires review, no automatic outreach, no message sent, draft only | Live copy |
| 3 | Draft library — 5 demo drafts (intro/status, HM feedback, follow-up, internal summary, consent review) | Demo-only |
| 4 | Draft preview — subject, body, placeholders, review checklist, trust boundary — no send button | Demo-only |
| 5 | Actions — copy draft client-side OK; Send/Schedule/Sequence/Mailbox disabled · Not live | Demo-only |
| 6 | Internal update card — status, open questions, next decision, follow-up owner, team tasks link | Pilot sample |
| 7 | Communication audit — draft created, consent review, feedback prepared, profile reviewed, NO outbound sent | Pilot sample |
| 8 | Human decisioning boundary | Live copy |

## Routes

### Recruiter (candidate)

- `/recruiter/candidates/demo-candidate-001/communication` (primary)

### Recruiter (job)

- `/recruiter/jobs/demo-role-001/communication`
- `/recruiter/jobs/demo-role-001/drafts` (alias — drafts focus)

### Company

- `/company/candidates/demo-candidate-001/communication`
- `/company/roles/demo-role-001/communication`
- `/company/roles/demo-role-001/drafts`

## Data boundary

- **Demo:** `frontend/src/lib/safe-communication-demo-data.ts` — deterministic, no real PII, no real email addresses, no network, no backend writes.
- **Live:** Not wired — `resolveCandidateSafeCommunication()` / `resolveJobSafeCommunication()` return demo record only for sample IDs.

## Link integration

- **Candidate Profile 360** — activity + feedback → communication route.
- **Job Pipeline** — decision memory → communication + drafts routes.
- **Collaboration** — decision memory audit → communication route.
- **Trust** — contact permission → communication with warning context.
- **Team Collaboration** — prepare communication draft task + audit → communication route.
- **`/demo` journey** — `safe_communication` step → `/recruiter/candidates/demo-candidate-001/communication`.

## Copy constraints

Never use: "email sent", "message sent", "sent successfully", "automatic outreach", "automatic application", "sequence started", "mailbox connected", "AI contacted", "GDPR compliant", "legally compliant".

Use: draft only, not sent, human review required, contact requires review, not live, demo-only, no automatic outreach.

## Hard bans (preserved)

- No changes to `LightweightRouteShell`, `PersonaWorkspaceGate`, `WorkspaceRouteLayout`, dashboard layouts, route fallback.
- No auth weakening; no auto-apply / outreach / calendar sync / ATS activation; no outbound email jobs.
- Launch stance **NO-GO** unchanged; P0 performance **OPEN** unchanged.

## Tests

```bash
cd frontend
npm run test:safe-email-communication-layer
PLAYWRIGHT_ENABLE_BROWSER_TESTS=1 PLAYWRIGHT_ENABLE_WEBSERVER=1 npm run test:safe-email-communication-layer-browser
```

## Constants

- `frontend/src/lib/safe-communication.ts`
- `frontend/src/components/recruiter/safe-communication-workspace.tsx`

## Polish report (22 sections)

1. **Mission** — Safe email communication draft-only layer for recruiter/company; connects Profile 360, Pipeline, Notes, Trust, Team, Decision Memory.
2. **Scope** — Pilot sample only (`demo-candidate-001`, `demo-role-001`); no backend writes; no PII; no outbound.
3. **Routes delivered** — 6 routes (candidate communication, job communication, job drafts × recruiter + company aliases).
4. **Page sections** — 8 sections per spec: header, consent warning, draft library, preview, actions, internal update, audit, boundary.
5. **Demo data** — `safe-communication-demo-data.ts` with 5 drafts, audit events, internal update card.
6. **Components** — `CandidateSafeCommunicationWorkspace`, `JobSafeCommunicationWorkspace`; drafts view scrolls to library.
7. **i18n** — `safeCommunication.*` namespace EN + PL; no user-facing literals outside `i18n.ts`.
8. **Invalid IDs** — `GuidedEmptyState` via `SAFE_COMMUNICATION_MARKERS.notFound`; HTTP 200, not Next 404.
9. **Disabled actions** — Send/Schedule/Sequence/Mailbox disabled · Not live; copy draft client-side only.
10. **Link integration** — Profile 360 activity/feedback, pipeline decision memory, collaboration audit, trust contact permission, team task → communication routes.
11. **Demo journey** — `safe_communication` step in `founder-led-demo-routes.ts`.
12. **Hard bans preserved** — No shell/gate/layout changes; auth/tests unchanged; launch NO-GO unchanged.
13. **Forbidden copy** — Static test #18 guards against banned phrases in workspace source.
14. **Required boundary phrases** — Static test #19 guards draft only, not sent, human review required, etc.
15. **Static tests** — `test:safe-email-communication-layer` — 20 assertions.
16. **Browser tests** — `test:safe-email-communication-layer-browser` — 3 specs, 18 assertions, workers=1.
17. **Regression suite** — All required P0 + layer tests + build + tsc must pass before merge.
18. **Docs** — This file + matrix updates in `PRODUCTION_REALITY_MATRIX`, `PUBLIC_LAUNCH_READINESS_MATRIX`, related layer docs.
19. **CI gate** — PR to `cursor/phase1-monorepo-scaffold`; CI green before merge.
20. **Deploy gate** — Merge → Vercel deploy → prod smoke with `PLAYWRIGHT_ALLOW_PROD_SMOKE=1`.
21. **Phase 3B** — **BLOCKED** unchanged; P0 performance **OPEN**; no auto-apply/outreach/calendar activation.
22. **North star alignment** — Drafts reduce noise toward acceptance-ready calendar items; no volume spam; human review before contact.
