# AI Career Assistant (7 features) — TWIN roadmap

Inspired by candidate manual workflows (company research, ATS CV, interview prep, negotiation, follow-ups). **Phase 1 ships one vertical slice at a time** — not a single 40h drop.

## Status

| Story | Feature | Repo today | Notes |
|-------|---------|------------|-------|
| US-C051 | Company intelligence | **MVP** | `company_intelligence` + `POST /jobs/{id}/research` |
| US-C052 | ATS CV optimizer | **MVP** | `career_assistant/ats_cv` + match before/after + modal |
| US-C053 | Interview prep | **MVP** | `interview_prep` + calendar/dashboard modals |
| US-C054 | Salary negotiation | **MVP** | Market band + counter email draft |
| US-C055 | Follow-up generator | **MVP** | Post-interview email from notes |
| US-C056 | Hiring manager mindset | **MVP** | Job-level top traits / red flags / interview focus |
| US-C057 | LinkedIn optimizer | **MVP** | Headline, about, skills from CV |

## API (`/api/v1/career-assistant`)

| Method | Path | Story |
|--------|------|-------|
| POST | `/applications/{id}/ats-cv` | US-C052 |
| GET | `/applications/{id}/ats-cv` | US-C052 (last run) |
| POST | `/interview-prep` body `{application_id?, scheduled_interview_id?}` | US-C053 |
| POST | `/applications/{id}/salary-negotiation` body `{offer_pln?}` | US-C054 |
| POST | `/interviews/{id}/follow-up` body `{notes}` | US-C055 |
| POST | `/jobs/{job_id}/hiring-insights` | US-C056 |
| POST | `/me/linkedin-optimize` body `{target_role}` | US-C057 |

**Also (US-C051):** `POST /api/v1/jobs/{job_id}/research`

## Database (migration `040_career_assistant_tables`)

- `optimized_cvs` — one row per application (US-C052)
- `interview_prep_sessions` — prep packs (US-C053)
- `salary_negotiations` — negotiation JSON per application (US-C054)
- `follow_up_emails` — drafts per scheduled interview (US-C055)
- `hiring_insights_cache` — 7-day TTL per job (US-C056)
- `linkedin_optimizations` — snapshots per candidate + target role (US-C057)
- `company_intelligence_cache` — migration `039` (US-C051)

## UI

- **Jobs feed:** Company intel, Hiring insights
- **Applications:** Optimize CV, Negotiate offer
- **Calendar:** Interview prep, Follow-up email
- **Dashboard:** LinkedIn optimizer (target role from profile)

## Principles

- North star: fewer noisy applications, more **acceptance-ready** moments — intel must reduce spam, not encourage blast apply.
- No fabricated employers/skills (same rules as `cv_tailoring.py`).
- Expensive calls cached where repeated (company intel, hiring insights); Claude via `career_assistant_common.call_claude_json` with deterministic fallbacks.
