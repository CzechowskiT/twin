# PP1 — Public Preview Gate (2026-08-07)

## Verdict
`PUBLIC READ-ONLY SYNTHETIC PRODUCT PREVIEW ENABLED — ISOLATED NON-MUTATING DATA, PUBLIC/PRIVATE CACHE BOUNDARIES AND KPI EXCLUSION PROVEN; PUBLIC PRODUCT LAUNCH REMAINS NO-GO`

## Alignment
| Surface | SHA |
|---------|-----|
| repo_head | `034ae28de79c207afface69287e5f9aecb2c2914` |
| prod API `git_commit` | `034ae28de79c207afface69287e5f9aecb2c2914` |
| worker `GIT_COMMIT_SHA` | `034ae28de79c207afface69287e5f9aecb2c2914` |
| FE production deploy | `twin-mlusu6y91` (scaffold tip; middleware CSP + method gates live) |
| CI smoke | [31155107318](https://github.com/CzechowskiT/twin/actions/runs/31155107318) SUCCESS |
| alignment_status | ALIGNED |
| docs_only_drift | false |
| Alembic | `127_guided_first_value_demo` (no PP1 migration) |

## Kill switch
- `PUBLIC_PREVIEW=READ_ONLY_SYNTHETIC` (Vercel + Railway twin + worker)
- `NEXT_PUBLIC_PUBLIC_PREVIEW=READ_ONLY_SYNTHETIC` (Vercel)
- Independent of Launch / enrollment / signup / pilot / invite
- Rollback exercised before enable (404 when unset) — see `ROLLBACK_EXERCISE.md`

## Prod checks (anon)
| Check | Result |
|-------|--------|
| GET `/preview` | 200 |
| HEAD/OPTIONS `/preview` | 200 |
| POST/PUT/PATCH/DELETE `/preview` | 405 |
| `?scenario=demo_scenario_v1` | 200 |
| `?scenario=prod_leak` | 404 |
| Markers + 7 IA areas | present |
| meta robots + X-Robots-Tag | noindex,nofollow,noarchive,nosnippet,noimageindex |
| CSP `connect-src 'self'` (no plausible/posthog) | yes |
| Referrer-Policy | no-referrer |
| HSTS (Vercel) | max-age=63072000; includeSubDomains; preload |
| Set-Cookie on `/preview` | 0 |
| robots.txt Disallow `/preview` | yes |
| sitemap `/preview` count | 0 |
| `/dashboard` anon | login shell; `private, no-store` |
| `/me` / API `/me` | 404 |
| Launch | NO-GO |
| Enrollment | OFF |
| Pilot | OPERATIONALLY_READY_INACTIVE |
| Caps / invites | 0 / 0 |

## Claims (forced)
PUBLIC_PREVIEW_RUNS_ARE_NOT_USERS · NO_UNIQUE_VISITOR_MEASUREMENT · NO_REAL_CANDIDATE_DATA · NO_REAL_CANDIDATE_VALIDATION · NO_DEMAND_VALIDATION · NO_CONVERSION_CLAIM · NO_RETENTION_CLAIM · NO_PUBLIC_PRODUCT_LAUNCH
