# Recruiter Daily Operating Cockpit — 2026-06-17

## Purpose

Pilot surface at `/recruiter/daily-cockpit` that aggregates **today's recruiter work** across system-of-record modules — decisions, trust/consent, feedback/scorecards, communication drafts, ATS import review, and pipeline changes — with an explicit **human decisioning boundary**.

This is **Task 3 only**: deterministic demo data, no live outbound, no ATS sync, no calendar scheduling, no auto-apply.

## Route

| Path | Component |
|------|-----------|
| `/recruiter/daily-cockpit` | `RecruiterDailyOperatingCockpitWorkspace` |

## Demo IDs (consistent with shipped SOR helpers)

| ID | Value |
|----|-------|
| Candidate | `demo-candidate-001` |
| Role | `demo-role-001` |
| ATS connector | `lever-mapping-pilot` |

Data sources: `candidate-profile-360-demo-data`, `job-pipeline-demo-data`, `ats-import-readiness-demo-data` — **not** the unmerged domain kernel branch.

## UI sections (10)

1. **Header** — pilot / NO-GO / draft-only badges + SOR quick links
2. **Today's priority worklist** — 7 ranked rows (6–8 required)
3. **Decision queue** — inbox/pipeline decisions awaiting recruiter
4. **Trust & consent queue** — consent review before drafts/outreach
5. **Feedback & scorecard queue** — missing panel feedback + pending scorecards
6. **Communication drafts queue** — copy-only; not sent
7. **ATS import review queue** — mapping/dedupe preview; no live sync
8. **Pipeline changes** — recent stage moves on demo-role-001
9. **Daily checklist** — recruiter-owned steps incl. launch NO-GO reminder
10. **Human decisioning boundary** — no AI-decides, no outbound, no sync

## Integration links FROM

- `/recruiter` — quick action + SOR hub card `recruiter_daily_cockpit`
- Founder `/demo` — journey step `daily_cockpit`
- Executive product proof — demo link `daily_cockpit`

## Module links TO (within cockpit header)

Profile 360, job pipeline, notes/feedback, trust, team, safe communication, ATS import readiness, decision memory, SOR hub.

## i18n

Namespace: `recruiterDailyCockpit.*` (EN + PL).

## Forbidden copy

No: email sent, automatic outreach, AI decided, GDPR compliant, ATS sync completed, calendar scheduled, writeback completed.

## Tests

```bash
cd frontend
npm run test:recruiter-daily-operating-cockpit          # 23 static assertions
PLAYWRIGHT_ENABLE_BROWSER_TESTS=1 PLAYWRIGHT_ENABLE_WEBSERVER=1 \
  npm run test:recruiter-daily-operating-cockpit-browser  # 18 browser assertions
```

## Launch stance

`LAUNCH_STANCE = noGo` — unchanged. P0 performance OPEN. Phase 3B controlled multitab HARD BLOCKED.

## Files

- `src/lib/recruiter-daily-operating-cockpit-demo-data.ts`
- `src/lib/recruiter-daily-operating-cockpit.ts`
- `src/components/recruiter/recruiter-daily-operating-cockpit-workspace.tsx`
- `src/app/recruiter/daily-cockpit/page.tsx`
- `scripts/recruiter-daily-operating-cockpit.test.ts`
- `e2e/recruiter-daily-operating-cockpit-browser.spec.ts`
