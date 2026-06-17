# Company Hiring Team Cockpit — 2026-06-17

## Purpose

Pilot surface at `/company/hiring-cockpit` that aggregates **hiring team work** across system-of-record modules — open roles, shortlist, feedback, scorecards, trust/consent, team assignments, communication drafts, and pipeline overview — with an explicit **human decisioning boundary**.

This is **Task 4 only**: deterministic demo data, no live outbound, no ATS sync, no calendar scheduling, no auto-apply.

## Route

| Path | Component |
|------|-----------|
| `/company/hiring-cockpit` | `CompanyHiringTeamCockpitWorkspace` |

## Demo IDs (consistent with shipped SOR helpers)

| ID | Value |
|----|-------|
| Candidate | `demo-candidate-001` |
| Role | `demo-role-001` |
| ATS connector | `lever-mapping-pilot` |

Data sources: `candidate-profile-360-demo-data`, `job-pipeline-demo-data`, `ats-import-readiness-demo-data` — **not** the unmerged domain kernel branch.

## UI sections (11)

1. **Header** — pilot / NO-GO / draft-only badges + SOR quick links
2. **Open roles** — active and draft roles with pipeline counts
3. **Candidate shortlist** — ranked shortlist rows (4–6)
4. **Pending feedback** — missing panel/HM feedback
5. **Scorecards review** — open scorecard drafts
6. **Trust & consent warnings** — consent review before drafts/outreach
7. **Team assignments** — hiring team ownership per candidate
8. **Communication drafts** — copy-only; not sent
9. **Pipeline overview** — stage counts on demo-role-001
10. **Decision checklist** — hiring-team-owned steps incl. launch NO-GO reminder
11. **Human decisioning boundary** — no AI-decides, no outbound, no sync

## Integration links FROM

- `/company/dashboard` — promo card + SOR hub card `company_hiring_cockpit`
- Founder `/demo` — journey step `company_hiring_cockpit`
- Executive product proof — demo link `hiring_cockpit`

## Module links TO (within cockpit header)

Company dashboard, open roles, Profile 360, job pipeline, notes/feedback, trust, team, safe communication, ATS import readiness, decision memory.

## Required links (no 404)

- `/company/dashboard`
- `/company/roles`
- `/company/roles/demo-role-001/pipeline`
- `/company/candidates/demo-candidate-001`
- decision-memory, collaboration, trust, team, communication, ATS import-readiness (company persona)

## i18n

Namespace: `companyHiringCockpit.*` (EN + PL).

## Forbidden copy

No: email sent, automatic outreach, AI decided, GDPR compliant, ATS sync completed, calendar scheduled, writeback completed.

## Tests

```bash
cd frontend
npm run test:company-hiring-team-cockpit          # 24 static assertions
PLAYWRIGHT_ENABLE_BROWSER_TESTS=1 PLAYWRIGHT_ENABLE_WEBSERVER=1 \
  npm run test:company-hiring-team-cockpit-browser  # 21 browser assertions
```

## Launch stance

`LAUNCH_STANCE = noGo` — unchanged. P0 performance OPEN. Phase 3B controlled multitab HARD BLOCKED.

## Files

- `src/lib/company-hiring-cockpit-demo-data.ts`
- `src/lib/company-hiring-cockpit.ts`
- `src/components/company/company-hiring-team-cockpit-workspace.tsx`
- `src/app/company/hiring-cockpit/page.tsx`
- `scripts/company-hiring-team-cockpit.test.ts`
- `e2e/company-hiring-team-cockpit-browser.spec.ts`
