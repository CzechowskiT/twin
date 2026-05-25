# Auto-apply reliability report (P0 sprint)

## Executive summary

P0 splits **“saved in TWIN”** from **“confirmed on employer site”**. Auto-apply and one-click flows no longer set `ApplicationStatus.applied` or user-facing “Sent” / “Wysłana” without evidence. Public MVP stats expose separate counters for created, prepared, attempted, confirmed, manual, and failed.

## What works (honest)

- Pracuj.pl Playwright fill and optional submit click with logging.
- Tailored PDF package upload to S3 when configured.
- Nightly sweep with board caps and consent.
- Demo jobs: in-TWIN only (`auto_apply_demo_simulated`), never confirmed stats.
- User pipeline statuses (interview, rejected, hired) unchanged.

## What was misleading (fixed in P0)

| Before | After |
|--------|-------|
| `FORM_FILLED` → `APPLIED` | `application_prepared`, `pending` |
| Pracuj `SUBMITTED` → `APPLIED` | `external_submit_attempted` |
| Open job link → `applied` | `manual_action_required` |
| One-click → `APPLIED` + `applied_at` | `application_prepared` |
| `mvp-stats` `total_applications` = all rows | Split metrics + kept `total_applications` |
| PL “Wysłana” for any `applied` | Phase-specific labels via `display_status` |

## P0 deliverables

- DB columns + Alembic `048_application_submission_evidence`
- `app/services/application_submission.py` orchestration
- API: `submission_status`, `display_status` on applications; `track_link_opened` on create
- Frontend honest labels (PL/EN)
- Tests: `backend/tests/test_application_submission_truth.py`
- Docs: this file, `APPLICATION_STATUS_TRUTH_TABLE.md`, `SUPPORTED_APPLY_MATRIX.md`

## P1 (not in this sprint)

- Parse employer confirmation pages / email for `confirmation_type`
- ATS webhook → `api_response` confirmation
- Recruiter inbox filter by `external_submit_confirmed` only
- Rename nightly consent counter from `applications_submitted` to `applications_attempted` in API schema

## Test results

Run:

```bash
cd backend && pytest tests/test_application_submission_truth.py tests/test_public_mvp_stats.py -q
cd frontend && npm run build
```

Record pass/fail and commit hash in release notes when tagging.

## Founding cohort readiness

Safe for pilot **if** copy and dashboards use new labels and investors use split `mvp-stats` fields — not `total_applications` as “submissions sent”.
