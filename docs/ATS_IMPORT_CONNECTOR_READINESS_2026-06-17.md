# ATS Import / Connector Readiness — 2026-06-17

**Branch:** `product/ats-import-connector-readiness-2026-06-17`  
**Routes:** import readiness workspace + mapping/deduplication views (recruiter + company)

## Purpose

Recruiter/company-facing **ATS import readiness** layer — connector matrix, field mapping preview, dedupe preview, consent/GDPR mapping, validation checklist, risk flags, sample candidate link, audit trail, and human review boundary. **Mapping/review only** for pilot walkthrough; invalid subroutes render meaningful not-found (not Next 404 shell). **No live ATS sync, no credentials, no writeback, no background jobs.**

## Page sections (10)

| # | Section | Status |
| - | ------- | ------ |
| 1 | Header — ATS Import Readiness, pilot/not live, no sync/writeback badges, links Talent Pool, Profile 360, Trust, Pipeline | Pilot sample |
| 2 | Connector matrix — Lever/Greenhouse mapping ready not live; Teamtailor/Recruitee/Workable planned; CSV/Manual pilot-ready | Demo-only |
| 3 | Field mapping preview — ATS→TWIN fields table, no real PII | Demo-only |
| 4 | Dedupe preview — email hash, name+role, CV fingerprint, talent pool, consent mismatch | Demo-only |
| 5 | Consent/GDPR mapping preview | Demo-only |
| 6 | Import validation checklist (8 items) | Pilot sample |
| 7 | Import risk flags | Pilot sample |
| 8 | Sample imported candidate demo-candidate-001 → demo-role-001 with links | Demo-only |
| 9 | Import audit trail — no live sync, no writeback | Pilot sample |
| 10 | Human review boundary | Live copy |

## Routes

### Recruiter

- `/recruiter/integrations/ats` (hub — links to import readiness)
- `/recruiter/integrations/ats/import-readiness` (primary)
- `/recruiter/integrations/ats/mapping`
- `/recruiter/integrations/ats/deduplication`
- `/recruiter/integrations/ats/*` (invalid) → `GuidedEmptyState`

### Company

- `/company/integrations/ats`
- `/company/integrations/ats/import-readiness`
- `/company/integrations/ats/mapping`
- `/company/integrations/ats/deduplication` → invalid view → `GuidedEmptyState`
- `/company/integrations/ats/*` (invalid) → `GuidedEmptyState`

## Data boundary

- **Demo:** `frontend/src/lib/ats-import-readiness-demo-data.ts` — deterministic, no real PII, no network, no backend writes.
- **Live:** Not wired — `resolveAtsImportReadiness()` returns demo record only.

## Link integration

- **Recruiter/company integrations** → `/…/integrations/ats/import-readiness`.
- **Talent pool import** → import readiness link (recruiter).
- **Candidate Profile 360** — activity → import readiness.
- **Trust** — `data_source === ats_import` → import readiness.
- **`/demo` journey** — `ats_import_readiness` step.

## Copy constraints

Never use: "ATS sync enabled", "live sync", "writeback enabled", "credentials saved", "import completed", "GDPR compliant", "legally compliant", "automatic outreach", "email sent", "message sent".

Use: import readiness, not live, no live ATS sync, no ATS writeback, human review required, privacy review required, demo-only, no automatic outreach.

## Hard bans (preserved)

- No changes to `LightweightRouteShell`, `PersonaWorkspaceGate`, `WorkspaceRouteLayout`, dashboard layouts, route fallback.
- No auth weakening; no live ATS sync / credentials / writeback / outreach / calendar sync.
- Launch stance **NO-GO** unchanged; P0 performance **OPEN** unchanged.

## Tests

```bash
cd frontend
npm run test:ats-import-connector-readiness
PLAYWRIGHT_ENABLE_BROWSER_TESTS=1 PLAYWRIGHT_ENABLE_WEBSERVER=1 npm run test:ats-import-connector-readiness-browser
```

## Constants

- `frontend/src/lib/ats-import-readiness.ts`
- `frontend/src/components/recruiter/ats-import-readiness-workspace.tsx`

## Polish report (21 sections)

1. **Mission** — ATS import readiness mapping/review layer for recruiter/company; no live sync.
2. **Scope** — Pilot demo connector only; no backend writes; no PII; no credentials.
3. **Routes delivered** — 8+ routes (recruiter hub, import-readiness, mapping, deduplication, company aliases, catch-all invalid).
4. **Page sections** — 10 sections per spec.
5. **Demo data** — `ats-import-readiness-demo-data.ts` with connectors, mappings, dedupe, consent, checklist, risks, sample candidate, audit.
6. **Components** — `AtsImportReadinessWorkspace`; mapping/deduplication views scroll to focus sections.
7. **i18n** — `atsImportReadiness.*` namespace EN + PL.
8. **Invalid routes** — `GuidedEmptyState` via `ATS_IMPORT_READINESS_MARKERS.notFound`; HTTP 200, not Next 404.
9. **Badges** — Pilot, no live ATS sync, no ATS writeback.
10. **Link integration** — Integrations hub, talent pool import, Profile 360 activity, trust data source, demo journey.
11. **Hard bans preserved** — No shell/gate/layout changes; auth/tests unchanged; launch NO-GO unchanged.
12. **Forbidden copy** — Static test #18 guards banned phrases.
13. **Required boundary phrases** — Static test #19 guards import readiness, not live, etc.
14. **Static tests** — `test:ats-import-connector-readiness` — 21 assertions.
15. **Browser tests** — `test:ats-import-connector-readiness-browser` — 3 specs, workers=1.
16. **Regression suite** — All required P0 + layer tests + build + tsc before merge.
17. **Docs** — This file + matrix updates.
18. **CI gate** — PR to `cursor/phase1-monorepo-scaffold`; CI green before merge.
19. **Deploy gate** — Merge → Vercel deploy → prod smoke with `PLAYWRIGHT_ALLOW_PROD_SMOKE=1`.
20. **North star alignment** — Reduces noise toward acceptance-ready profiles; import review before calendar moments.
21. **Next slice (not in scope)** — OAuth credentials UI remains on existing ATS panel; live sync deferred.
