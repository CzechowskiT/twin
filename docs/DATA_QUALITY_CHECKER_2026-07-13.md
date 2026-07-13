# Data quality checker — ops dashboard contract (2026-07-13)

> **Status:** CURRENT · **Stance:** PILOT · Launch **NO-GO**

## Scope

Read-only ops report for scraped job validity, recruiter talent pool quality scores, and market coverage freshness.

## Surfaces

| Layer | Path |
|-------|------|
| API | `GET /api/v1/admin/data-quality` |
| Frontend | `/admin/data-quality` |
| Service | `backend/app/services/data_quality_metrics.py` |

## Contract

- **Auth:** ops admin token only — never public  
- **PII:** aggregate counts only in default response  
- **Writes:** none — checker is read-only  
- **Alerts:** stale market feed surfaced via existing health `?ops=1` flags

## Guard

`npm run test:data-quality-checker-guard`

**Status:** wired on scaffold; no schema changes in hardening batch.
