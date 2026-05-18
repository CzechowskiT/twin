# Errata — QA / security docs vs current code

Imported from external drafts (`twin_test_plan.md`, `twin_security_detailed.md`, `twin_audit_report.md`). Use this file when executing manual tests or triaging findings.

## API paths and behaviour

| Topic | Docs often say | Current codebase |
|-------|----------------|------------------|
| Health | `/api/v1/health/features` returns many OAuth flags | `GET /api/v1/health/features` returns only `google_calendar_oauth_configured`, `smtp_configured` (`backend/app/api/health.py`). |
| Job filters | `?skills=Python`, URL `skills=` | `GET /api/v1/jobs/` uses `q`, `title_terms`, `location`, `job_board`, `min_salary`, `sort`, `skip`/`limit` (`backend/app/api/jobs.py`). |
| Dashboard filter persistence | Key `job-filters` | `localStorage` key `twin_dashboard_job_filters_v1` (`frontend/src/lib/jobs.ts`). |
| Applications CSV filename | `applications.csv` | Response uses `twin-applications.csv` (`Content-Disposition` in `applications.py`). |
| Placement events (IDOR) | `GET /api/v1/placement/events/{id}` without ownership | Events are **`GET /api/v1/applications/{application_id}/placement-events`** with **candidate ownership check** → foreign `application_id` returns **404** (`applications.py`). |
| Placement magic link | `GET /placement/confirm/{token}` | **`POST /api/v1/placement/verify/confirm`** with JSON `{ "token": "..." }` (`placement.py`). |
| Calendar ICS | Bulk `twin_interviews.ics` | **Per interview:** `GET /api/v1/calendar/interviews/{id}/ics` → `twin-interview-{id}.ics`. |
| `include_cancelled` | On ICS export | On **list:** `GET /api/v1/calendar/google/interviews?include_cancelled=true`. |
| Login brute force | “No rate limit” | **`enforce_login_rate_limit_per_minute`** on login paths (`login_rate_limit.py`); in-process bucket (not shared across API replicas). |

## Calendar cancel vs Google

Docs note Google event may remain after TWIN cancel — still largely accurate until a sync-delete feature ships; verify on each release.

## Audit report table

`docs/reviews/audit-report-2026-05-19.md` cites line numbers and routes (e.g. `calendar.py` PATCH, `/interviews.ics`) that may not match this branch. Treat narrative as **directional**; verify against grep/`router.py` before opening tickets.

## Failing / flaky CI (known)

See `docs/AGENT_SHIPPING_LOG.md` if present: full `pytest` may still report failures in unrelated modules (e.g. KYC / talent pool) — triage before blocking a release on QA doc alone.
