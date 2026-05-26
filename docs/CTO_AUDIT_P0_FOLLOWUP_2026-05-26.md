# CTO audit P0 follow-up — 2026-05-26

Branch: `cursor/phase1-monorepo-scaffold`  
Commit message: `fix(audit): close CTO P0 demo and scrape risks`

## Closed in this change (P0)

| Item | Change |
|------|--------|
| Demo snapshot honesty | `GET /api/v1/demo/snapshot` uses `source: demo_seed` or `static_fallback`, never `live_db`; `demo_mode`, `sample_data`, `data_disclaimer` on all paths |
| Founder PII in docs | `docs/DEMO_LOGIN_FOR_FOUNDER.md` — recommended login `demo@twin.career`; founder email in optional private section only |
| LinkedIn scraper | Removed `navigator.webdriver` masking and `--disable-blink-features=AutomationControlled`; `LINKEDIN_SCRAPE_ENABLED=false` by default; excluded from default board order / scrape-all unless explicitly enabled |
| Manual scrape | Tests assert `can_trigger_scrape: false` unless `SCRAPE_USER_TRIGGER_ENABLED=true` |
| Robots | `SCRAPE_RESPECT_ROBOTS_TXT` remains default `true` (unchanged) |

## Remains P1 (not in this PR)

| Item | Notes |
|------|--------|
| Frontend lint | **64 problems** (55 errors, 9 warnings) as of 2026-05-26 — mostly `react-hooks/set-state-in-effect` across dashboard/marketing; not fixed in P0 (dashboard ~2.2k LoC untouched) |
| Prod env alignment | Railway `DEMO_USER_EMAIL=demo@twin.career`, re-seed if snapshot still `static_fallback` |
| Investor runbooks | Older docs still mention `live_db` — update `INVESTOR_DEMO_RUNBOOK.md`, `RAILWAY_DEMO_ENV_CHECKLIST.md` when touching demo ops |
| `verify-investor-demo-ready.sh` on prod | Re-run after deploy + seed |
| Stripe / Microsoft calendar on prod | Unchanged — not P0 for demo honesty |
| Dashboard lint debt | Document count in CI or `docs/CTO_PRODUCT_TECH_AUDIT_2026-05-26.md` if lint fails |

## Remains P2

- LinkedIn OAuth prod configuration (sign-in, not job scrape)
- Full scrape compliance review for global HTML boards
- E2E expansion beyond smoke (`frontend/e2e/smoke.spec.ts`)

## FULL GO E2E for 10–20 users?

**Still valid as a staged pilot**, not a public launch:

- **Go** for 10–20 **consented** pilot users with: seeded `demo@twin.career` for investor walkthrough, beat scrape on PL boards only, manual scrape off, demo labels on `/demo`.
- **No-go** until P1: prod seed verified (`demo_seed`, apps ≥ 1, interviews ≥ 1), founder not required on demo path, lint/CI green on touched paths.

## What NOT to communicate publicly

- Do **not** claim “live production job feed” on `/demo` or marketing — say **sample / demo data**.
- Do **not** advertise LinkedIn job scraping or “we scrape LinkedIn.”
- Do **not** publish founder private email, demo passwords, or `DATABASE_PUBLIC_URL`.
- Do **not** promise auto-apply to real job boards without explicit user consent and board-specific compliance.

## Safe redeploy?

**Yes**, after merge: API + frontend are backward-compatible (new JSON fields on snapshot; stricter scrape defaults). **Action:** redeploy API and Vercel frontend; optionally set `DEMO_USER_EMAIL=demo@twin.career` and run `seed-investor-demo.py` if prod still returns `static_fallback`.

## Verdicts (internal)

| Question | Verdict |
|----------|---------|
| FULL GO 10–20 pilot? | **Conditional GO** — demo honesty + scrape defaults fixed in code; confirm prod seed + health after deploy |
| Investor / CTO review? | **GO** for scripted demo with `demo@twin.career` and SAMPLE labels |
| Public launch? | **NO** — P1 env, metrics honesty, payments/calendar, lint/QA backlog |
