# Recruiter Talent Pool Import MVP — 2026-06-15

## Purpose

Structured **internal** talent pool for recruiters: CSV paste import, data quality scoring, duplicate detection, and Talent Radar surfacing. This is **data readiness**, not external sourcing.

## Scope (in)

- Routes: `/recruiter/talent-pool`, `/recruiter/talent-pool/import`
- Tables: `recruiter_talent_pool_imports`, `recruiter_talent_pool_records` (migration `059`)
- API: `GET /api/v1/recruiter/talent-pool`, `POST .../import/preview`, `POST .../import/commit`
- BFF proxies under `/api/recruiter/talent-pool/*`
- Talent Radar segment/signal: `imported_internal_pool`, source chip **Talent pool**
- Audit events: `talent_pool_import_previewed`, `talent_pool_import_committed`, `talent_pool_record_created`, `talent_pool_duplicate_detected`, `talent_pool_import_failed`
- i18n EN + PL
- Tests: `test:recruiter-talent-pool-import-mvp` (16), `tests/test_recruiter_talent_pool_import.py` (12)

## Hard bans (out)

- NO LinkedIn / external sourcing
- NO email / phone columns in import
- NO auto outreach
- NO live ATS sync
- NO launch GO

## CSV format

Required: `display_name`

Optional: `job_title`, `skills` (semicolon/comma separated), `location`, `seniority`, `external_ats_id`, `candidate_id`, `application_id`, `job_id`, `pipeline_status`

Forbidden columns: `email`, `phone`, `cv`, `linkedin_url`

## Data model

### recruiter_talent_pool_imports

Batch metadata: `company_slug`, `import_source`, `status` (preview|committed|failed), counts, `warnings_json`, `audit_json`.

### recruiter_talent_pool_records

Company-scoped structured rows: display name, skills JSON, data quality JSON, `duplicate_key` (SHA256 of company + name + external refs).

## Services

- `RecruiterTalentPoolImportService` → `recruiter_talent_pool_import.py`
- `RecruiterTalentPoolService` → `recruiter_talent_pool.py`

## UX

Premium dark studio: summary panels, data quality warnings, source coverage (internal only), CSV paste → preview → commit, empty states with trust copy.

## Launch stance

**PILOT** — internal data readiness only. Public launch remains **NO-GO**.

## Verification

```bash
cd backend && pytest tests/test_recruiter_talent_pool_import.py -q
cd frontend && npm run test:recruiter-talent-pool-import-mvp
cd frontend && npm run build && npx tsc --noEmit
```

## Related docs

- `docs/RECRUITER_TALENT_RADAR_MVP_2026-06-12.md`
- `docs/RECRUITER_TALENT_RADAR_DECISIONS_AUDIT_2026-06-15.md`
- `docs/RECRUITER_TALENT_RADAR_WEEKLY_DIGEST_2026-06-15.md`
