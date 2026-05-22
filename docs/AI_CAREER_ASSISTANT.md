# AI Career Assistant (7 features) — TWIN roadmap

Inspired by candidate manual workflows (company research, ATS CV, interview prep, negotiation, follow-ups). **Phase 1 ships one vertical slice at a time** — not a single 40h drop.

## Status

| Story | Feature | Repo today | Next slice |
|-------|---------|------------|------------|
| US-C051 | Company intelligence | **MVP** `company_intelligence` + `POST /jobs/{id}/research` | News API / scrape |
| US-C052 | ATS CV optimizer | **Partial** `cv_tailoring` + `POST /candidates/me/cv/tailor` | Before/after UI + match score |
| US-C053 | Interview prep | — | `interview_prep` service + calendar hook |
| US-C054 | Salary negotiation | — | Market data + offer email draft |
| US-C055 | Follow-up generator | — | Post-interview email from notes |
| US-C056 | Hiring manager mindset | **Partial** `recruitment_feedback` | Job-level “top 3%” panel |
| US-C057 | LinkedIn optimizer | **Partial** `linkedin_viral` | Profile headline/summary |

## US-C051 (shipped in code)

- **API:** `POST /api/v1/jobs/{job_id}/research` (auth required)
- **Cache:** `company_intelligence_cache` (7-day TTL per company + title)
- **UI:** Dashboard job row → “Company intel” → modal with priorities, pain points, insider language, cover letter draft
- **Claude:** Uses `get_anthropic_client()`; deterministic fallback from JD when API key unset

## Principles

- North star: fewer noisy applications, more **acceptance-ready** moments — intel must reduce spam, not encourage blast apply.
- No fabricated employers/skills (same rules as `cv_tailoring.py`).
- Expensive calls cached; consent-gated where auto-apply touches employer systems.
