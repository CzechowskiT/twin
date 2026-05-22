# AI Career Assistant (7 features) — TWIN roadmap

Inspired by candidate manual workflows (company research, ATS CV, interview prep, negotiation, follow-ups). **Phase 1 ships one vertical slice at a time** — not a single 40h drop.

## Status

| Story | Feature | API | UI |
|-------|---------|-----|-----|
| US-C051 | Company intelligence | `POST /api/v1/jobs/{job_id}/research` | Job row → Company intel modal |
| US-C052 | ATS CV optimizer | `POST /api/v1/applications/{id}/optimize-cv` | Applications → Optimize CV |
| US-C053 | Interview prep | `GET /api/v1/interviews/{id}/prep` | Calendar → Interview prep |
| US-C054 | Salary negotiation | `POST /api/v1/offers/{id}/negotiate` (`id` = application_id) | Applications → Negotiate offer |
| US-C055 | Follow-up generator | `POST /api/v1/interviews/{id}/follow-up` | Calendar → Follow-up |
| US-C056 | Hiring manager mindset | `GET /api/v1/jobs/{job_id}/hiring-insights` | Job row → Hiring insights |
| US-C057 | LinkedIn optimizer | `POST /api/v1/candidates/me/optimize-linkedin` | Dashboard profile → Optimize LinkedIn |

**Backend:** `backend/app/api/career_assistant.py` (except C051 on `jobs.py`). Services under `backend/app/services/`. Shared Claude JSON helper: `career_assistant_common.py`. Migration `040_career_assistant_tables.py`.

## Principles

- North star: fewer noisy applications, more **acceptance-ready** moments — intel must reduce spam, not encourage blast apply.
- No fabricated employers/skills (same rules as `cv_tailoring.py`).
- Expensive calls cached where applicable (company intel, hiring insights: 7-day TTL).

## Overlap (do not duplicate)

- **cv_tailoring** — profile-level pitch; C052 is per-application ATS rewrite + match delta.
- **recruitment_feedback** — post-rejection notes; C056 is job-level “what top applicants show”.
- **linkedin_viral** — referral incentives; C057 is profile copy optimization.
