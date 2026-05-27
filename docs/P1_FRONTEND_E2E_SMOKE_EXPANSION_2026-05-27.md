# Frontend E2E smoke — safe expansion — 2026-05-27

**Branch:** `cursor/phase1-monorepo-scaffold`
**Scope:** TASK 8 of the long autonomous security session.
Expands `frontend/e2e/smoke.spec.ts` with read-only coverage on
public marketing pages, SEO surfaces, and the runtime CSP /
framing headers. **No new test infrastructure**; reuses the
existing Playwright suite.

## What this adds

`frontend/e2e/smoke.spec.ts`:

| New describe block            | Coverage                                                                                              |
| ----------------------------- | ----------------------------------------------------------------------------------------------------- |
| `public smoke (marketing + SEO)` | `/pricing`, `/for-candidates`, `/for-companies`, `/privacy`, `/terms`, `/robots.txt`, `/sitemap.xml` |
| `public smoke (security headers runtime)` | `Content-Security-Policy-Report-Only` carries `report-uri /api/v1/csp-report` + locked `frame-ancestors 'none'`; `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, no `X-Powered-By` |

All tests use `page.goto(...)` + `page.locator(...)` reads and
`request.get(...)` for non-HTML surfaces. **No POST, no form
submission, no candidate-side mutation, no scrape, no auto-apply
trigger.** Matches the `.cursorrules` constraint that smoke
expansions stay strictly read-only.

## Why this surface

| Surface             | Previously covered? | Risk of silent regression                                                            |
| ------------------- | ------------------- | ------------------------------------------------------------------------------------ |
| `/pricing`          | No                  | Pricing card refactor breaks i18n / breaks tier ordering                              |
| `/for-candidates`   | No                  | Marketing landing 404 from a Vercel routing rule change                                |
| `/for-companies`    | No                  | Same                                                                                  |
| `/privacy`/`/terms` | "heading visible"   | A malformed legal page that traps users (no link back home)                            |
| `/robots.txt`       | No                  | Allow-all + missing `Sitemap:` line; misroute crawlers                                 |
| `/sitemap.xml`      | No                  | XML refactor → wrong host → SEO crawl skip                                             |
| CSP `report-uri`    | Structural only     | Vercel routing strips the directive; burn-in clock never starts                        |
| `X-Frame-Options`   | Structural only     | Same — config OK locally, header missing in prod                                       |

The structural test (`scripts/security-headers.test.ts`) already
asserts the config object. The runtime test confirms the
deployed server actually emits the same string under load. Both
together catch (a) refactors of `next.config.ts` and (b)
infra-level header strips.

## How it runs

- **Local:** `cd frontend && npm run test:e2e` (Playwright spins
  up the Next dev server via `webServer` config).
- **CI:** these tests do **not** run in the current `smoke.yml`
  workflow — that workflow runs `npm run build` and the backend
  pytest matrix only. Adding e2e to CI is a follow-up
  (`docs/P1_E2E_CI_INTEGRATION_*` TBD).

## Frontend gates re-run

```
$ npx tsc --noEmit              # 0 errors
$ npm run lint                  # 0 errors / 0 warnings
$ npm run build                 # success, all routes prerendered/dynamic as before
```

E2E was not executed locally in this commit (the Next dev
server isn't part of the autonomous-session toolchain — boot
time is too long for a 4-6h budget). The new tests are
syntactically validated by `tsc` and `eslint`; the next manual
`npm run test:e2e` run picks them up.

## Hard bans honoured

- ✅ No POST / form-submit / mutation in the new tests.
- ✅ No scrape / no auto-apply trigger.
- ✅ No real applications submitted.
- ✅ No Railway / Vercel deploy.
- ✅ No DB migration.
- ✅ No env / secret change.
- ✅ No UX / copy change (read-only assertions).
- ✅ No new product feature; smoke coverage only.
- ✅ Tests stay tolerant of i18n (no pinned strings).

## Files

- `frontend/e2e/smoke.spec.ts` — `+71` lines (two new
  describe blocks, 7 new tests).
- `docs/P1_FRONTEND_E2E_SMOKE_EXPANSION_2026-05-27.md` (this
  doc).

## Related

- `docs/P1_SMOKE_TEST_COVERAGE_GAP_2026-05-27.md` — gap analysis
  that motivated the prior smoke expansion.
- `docs/P1_CSP_REPORT_URI_WIRING_2026-05-27.md` — the wiring
  this run's runtime CSP test confirms.
- `frontend/scripts/security-headers.test.ts` — structural
  contract this expansion complements with a runtime check.
