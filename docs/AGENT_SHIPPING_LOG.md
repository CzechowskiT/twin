# Agent shipping log

## 2026-05-19 — Fundraising / traction

- `GET /api/v1/public/mvp-stats` — aggregate non-PII counters (jobs, users, applications, CV profiles, registry size, LinkedIn/Stripe config flags) for investor diligence.
- `/calculator` page: `MvpLiveStatsStrip` fetches the endpoint (EN/PL copy).

### MVP backlog (steps 16–18, 24–25, 33–34, 41)

- **16–18 GDPR JSON export:** `GET /api/v1/candidates/me/export.json` returns an attachment (`twin-my-data.json`) assembled by `build_user_owned_export_payload` — account fields without Stripe customer/subscription IDs or `referral_public_token`, full `candidate` row, `applications`, joined **`applications_summary`** (`total`, `by_status`, per-row job title/company/url, etc.). Tests: `backend/tests/test_candidates_me_export_json.py`. Dashboard download + EN/PL strings (`exportMyDataJson`, `exportMyDataJsonAria`) shipped in `8d45286`.
- **24–25 FE CSV / export errors + matches loading:** `csvExportUserMessage` maps 401/403/404 and network failures to `dashboard.csvExport*` / `dashboard.apiNetworkError` copy; matches panel shows a pulse skeleton with `aria-busy` while initial matches load (`matchesInitialSkeleton`). `8d45286`.
- **33–34 Health DB flag:** `GET /api/v1/health/features` includes **`database_reachable`** (cheap `SELECT 1` via SQLAlchemy `engine.begin()`, with PostgreSQL `SET LOCAL statement_timeout = '2s'`). `GET /api/v1/health?db=true` still adds **`db_ok`** for the same probe without changing the default `/health` JSON shape for existing clients.
- **41 Dashboard footer:** main dashboard footer links to `/privacy` and `/terms` with i18n keys `dashboard.footerPrivacy` / `dashboard.footerTerms`. `8d45286`.

**Pytest (`backend/tests/`):** 166 passed, 1 skipped (2026-05-19, project venv).

## 2026-05-18 — 50-step MVP pass (partial)

**Branch:** `cursor/phase1-monorepo-scaffold`

### Completed (steps 1–13)

1. Pytest for `GET /api/v1/health` and `/health/features` (mocked Google + SMTP branches).
2. Calendar `_ensure_application_owned` uses explicit `detail=` on `HTTPException`.
3. Dashboard + `JobList`: `aria-label` on apply, auto-apply, save, dismiss, scrape CTA, CSV exports.
4. `GET /calendar/google/interviews` optional `limit` query (1–50, default 25).
5. Pytest validates `include_cancelled` + `limit` combinations.
6. Calendar page: optimistic cancel + debounced interview list refresh (avoids stacked `load()`).
7. `GET /applications/me` pagination via `limit` / `offset` + accurate `total`.
8. Pytest `test_applications_me_list.py` for offset/total.
9. Dashboard applications header shows loaded vs total with EN/PL strings.
10. In-process per-IP rate limit for `/auth/login` and `/auth/login/json` (configurable; 429 test with mocked auth).
11. `AUTH_LOGIN_RATE_LIMIT_PER_MINUTE` documented in repo root `.env.example`.
12. Celery task `send_interview_reminder_email` (no-op without SMTP; pytest for both branches).
13. Celery beat: commented example + docstring for reminder wiring (safe default unchanged).

### Not completed in this session (steps 14–50)

Deferred here to respect minimal-diff scope and time; each item remains valid backlog.

14–15. User notification prefs API + calendar FE toggle (needs product field + feature flag wiring).
16–18. GDPR JSON export + dashboard link + remaining i18n for export UX.
19–20. Google Calendar `events.delete` on cancel + expanded tests.
21. Job save idempotency test (verify current behaviour first).
22–23. Scraper validation tightening + matcher empty-profile test.
24–25. FE CSV error handling + matches loading skeleton.
26. OpenAPI tags cleanup.
27. `ci-check` Makefile or npm script.
28. Sanitize one route’s error surface + test.
29. `next/image` for a heavy asset (audit needed).
30–31. Alembic index comment or composite index on `applications.user_id` (schema uses `candidate_id` — needs model review).
32. Calendar checkbox focus order.
33–34. Health DB connectivity flag + test.
35–36. Profile “last updated” + `Candidate` field/migration.
37. Auto-apply guard + test.
38. FE auto-apply last-run (endpoint audit).
39–40. Stripe webhook skeleton + `.env.example` (partial overlap with existing billing routes — verify).
41. Dashboard footer privacy/terms links.
42. CORS preflight pytest or doc.
43. i18n duplicate string cleanup.
44. `robots.txt` / metadata staging audit.
45–46. `X-Request-ID` middleware + FE correlation header.
47. Interview ordering pytest (`include_cancelled`).
48. FE empty state for zero jobs after filters.
49. Consolidate this log after full pass.
50. Broad pytest + `chore: ci fixes` commit.

### Risks

- Rate limiter is in-process (not shared across API replicas); document for horizontal scale.
- Applications dashboard loads up to 500 rows; very large pipelines may still need virtualized UI.

### Step 50 (full `pytest tests/`)

Run on 2026-05-18: **153 passed**, 1 skipped, **4 failed** (appear unrelated to steps 1–13: `test_kyc_authologic.py`, `test_talent_pool.py` ×3). No `chore: ci fixes` commit until those are triaged against a live Postgres + Authologic fixtures.

### 2026-05-18 — Triage: KYC + talent pool “failures”

**Root cause (not live Authologic / Postgres):**

- `POST /kyc/authologic/start` now requires JSON `identity_provider_processing_consent: true`; the test sent an empty body → **422**. Fixed test payload only.
- Talent pool `is_talent_pool_validated` and anonymous listing filter require **pool opt-in timestamp** plus **terms / job-data / AI-matching** consent timestamps on `User`. Tests only set `gdpr_consent_at` → candidates never counted as validated or listed. Fixed fixtures to set those fields.

**Run:** from `backend/`, use project venv (`backend/.venv/bin/pytest tests/`) so optional deps like `fpdf2` resolve; system `python3 -m pytest` may miss them.

**Result:** `157 passed`, 1 skipped (2026-05-18 after fixes).
