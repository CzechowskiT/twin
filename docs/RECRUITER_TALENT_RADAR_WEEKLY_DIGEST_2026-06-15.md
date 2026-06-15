# Recruiter Weekly Talent Radar Digest — 2026-06-15

## Product principle

Talent Radar shows signals. Recruiter decides. TWIN remembers. Weekly Digest helps the recruiter review what needs attention.

**EN:** Weekly Talent Radar Digest  
**PL:** Tygodniowy digest Radaru Talentów

This is a **dashboard digest + copy summary** — not email sending, not automatic outreach, not external sourcing.

## Routes

| Surface | Path |
| ------- | ---- |
| UI | `/recruiter/talent-radar/digest` |
| Hub tile | `/recruiter` → Weekly Talent Radar Digest (Pilot) |
| Talent Radar link | `/recruiter/talent-radar` → “View weekly digest” |
| BFF | `GET /api/recruiter/talent-radar/digest` |
| API | `GET /api/v1/recruiter/talent-radar/digest` |

Query params: `period=7d|30d|week`, `jobId` (optional), `includeDismissedSummary` (optional, default true).

Auth: same as Talent Radar — `X-Twin-Recruiter-Token` + `company_slug`.

## What it summarizes

1. **Review first** — strong/good fit, no dismiss/snooze, enough evidence (deduplicated, max 5 shown)
2. **Returning from snooze** — snooze window due or near due
3. **Shortlist without follow-up** — shortlisted >3 days with no later action
4. **Dismissed patterns** — aggregate reason codes only (no PII list)
5. **Low-coverage roles** — roles with thin radar signals
6. **Drafts prepared — not sent** — aggregated per candidate/role with `draftCount`, `aggregateLabel` (e.g. “6 szkiców przygotowanych — żaden nie wysłany”)

Summary cards: unique candidates, candidates to review, snooze returns, shortlist gaps, new decisions, low-coverage roles, draft candidates (+ `draftDecisionCount` raw total).

**Deduplication key order:** `application_id` → `candidate_id+job_id` → `candidate_id` → `displayName+roleTitle`.

**Section cap:** 5 items per section; overflow shows “+X więcej w Radarze” → `/recruiter/talent-radar`.

**Per-item fields:** `draftCount`, `decisionCount`, `latestDecisionAt`, `firstDecisionAt`, `aggregateLabel`, `recommendedNextAction`.

## What it does NOT do (hard bans)

- No email send or scheduled digest email
- No automatic outreach or auto-contact
- No LinkedIn scraping or external sourcing
- No “AI selected best candidate” or guaranteed fit language
- No hidden PII (email, phone, CV text)
- No auth/CSP weakening or destructive DB changes

## Data sources

- `build_recruiter_talent_radar` suggestions (internal workspace)
- `recruiter_talent_radar_decisions` table (existing migration 058)
- Company-scoped jobs via `list_company_jobs`

## Trust copy

Every digest page states: review-only, no messages sent, recruiter decides.

Copy button writes templated summary to clipboard — does not invoke mail/send APIs.

## Tests

```bash
cd frontend && npm run test:recruiter-talent-radar-weekly-digest
cd frontend && npm run test:recruiter-talent-radar-weekly-digest-premium
cd ../backend && pytest tests/test_recruiter_talent_radar_digest.py -q
```

Premium UX (2026-06-15): deduplicated drafts, executive narrative with `uniqueCandidateCount`, visible **Kopiuj podsumowanie** / **Skopiowano**, section meta with overflow link.

## Launch stance

**Public launch NO-GO unchanged.** Pilot-only recruiter workspace tool.

## Future roadmap (not in this PR)

- Scheduled digest email (opt-in)
- Slack/Teams summary
- Weekly subscription per role
- ATS import for richer memory
- External consent-aware signals
