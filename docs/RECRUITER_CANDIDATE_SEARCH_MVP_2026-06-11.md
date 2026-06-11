# Recruiter candidate pool search MVP — 2026-06-11

## Scope

Safe **workspace search** over candidates already linked to a recruiter company — applications and demo seed data only. **Not** a global sourcing engine.

| In scope | Out of scope (hard ban) |
| -------- | ----------------------- |
| Filter/search inbox+pipeline rows for one `company_slug` | LinkedIn scraping |
| Reuse inbox PII visibility + review card metadata | External DB / “millions of candidates” claims |
| Link to inbox review card (`?highlight=`) | Auto-contact / delegated apply |
| Demo pool label for `nova-hiring-pl` | Public launch GO |

## Routes

| Surface | Path |
| ------- | ---- |
| UI | `/recruiter/search` |
| Workspace tile | `/workspace/recruiter` → Search current candidate pool |
| BFF proxy | `GET /api/recruiter/search` |
| API | `GET /api/v1/recruiter/search` |

Auth: same as inbox — `X-Twin-Recruiter-Token` + `company_slug`.

## Filters (query params)

- `q` — broad keyword (name, skills, role, location blob)
- `name`, `role_title`, `skills`, `location`
- `min_score`, `max_score`
- `status` — application status
- `pipeline_status` — ATS-lite stage (derived from application status when no explicit field)
- `data_confidence` — review card heuristic
- `missing_data` — `true` / `false` (uncertain_or_missing)
- `availability` — `pool_opt_in` / `not_pool` (talent pool opt-in)

## Copy (i18n `recruiterSearch.*`)

- EN + PL full strings; other locales inherit EN via overlay merge.
- Required phrases: “Search current candidate pool”, “Demo pool”, “No external sourcing connected yet”.
- Hard-ban copy avoids naming specific scraping vendors in user-facing strings.

## Tests

```bash
cd frontend
npm run test:recruiter-candidate-search-mvp
cd ../backend && pytest tests/test_recruiter_candidate_search.py -q
```

## Launch stance

**Public launch NO-GO unchanged.** Pilot-only recruiter workspace tool.
