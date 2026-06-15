# Company Talent Pool View MVP — 2026-06-15

**Status:** Pilot · **Launch:** NO-GO (organizational memory only)

## Purpose

Company-facing **talent memory** for employers — structured view of candidates the organization already knows. This is **not** live ATS sync, **not** external sourcing, **not** automatic outreach.

Builds on recruiter talent pool import (`docs/RECRUITER_TALENT_POOL_IMPORT_MVP_2026-06-15.md`) with the same `recruiter_talent_pool_*` tables (migration 059). No new migration.

## Route

| Surface | Path |
|---------|------|
| Company UI | `/company/talent-pool` |
| BFF | `GET /api/company/talent-pool` |
| Backend | `GET /api/v1/company/talent-pool` |

## Auth

Same pilot gate as other `/company/*` routes: `RECRUITER_INBOX_TOKEN` + `company_slug` via `recruiterInboxProxyGate` → `_resolved_company_slug`.

## Response (summary)

- `executive_summary` — 6 cards: known, imported, radar-ready, data gaps, duplicates, active/planned sources
- `data_quality.dimensions` — missing role/title, skills, consent link, stale, duplicates
- `source_coverage` — applications, inbox, scorecards, notes, import pool, ATS connectors (planned)
- `items` — safe display (display_name, job_title, skills) — **no email/phone**

## UX chips

Pilot · Internal data first · No automatic outreach · Recruiter review required · ATS sync planned

## CTAs

- Recruiter CSV import (`/recruiter/talent-pool/import`) — company view links, does not import directly
- Integrations readiness (`/company/integrations`)
- Pipeline overview (`/company/pipeline`)

## Hard bans (unchanged)

- NO PII exposure (email/phone)
- NO LinkedIn / external sourcing claims
- NO email send / auto outreach
- NO live ATS sync GO
- NO launch GO

## Tests

```bash
cd frontend && npm run test:company-talent-pool-view-mvp
cd backend && pytest tests/test_company_talent_pool.py -q
```

## Links from

- `/company/dashboard` (workspace module card — Pilot)
- Company workspace nav
- `/company/pipeline`, `/company/integrations`, `/company/roles` (footer cross-links)

## Related docs

- `docs/RECRUITER_TALENT_POOL_IMPORT_MVP_2026-06-15.md`
- `docs/PRODUCTION_REALITY_MATRIX_2026-05-27.md`
- `docs/PUBLIC_LAUNCH_READINESS_MATRIX_2026-06-02.md`
