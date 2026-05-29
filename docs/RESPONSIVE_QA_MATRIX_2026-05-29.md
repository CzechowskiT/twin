# Responsive QA matrix — 2026-05-29

**Target:** `https://twin-sooty.vercel.app` (prod alias)  
**Method:** Playwright viewport script (unauthenticated) + HTTP status + `e2e/smoke.spec.ts` against prod  
**Auth dashboard subpages:** not fully exercised (no credentials in agent session).

## Viewports

| ID | Width × height |
| -- | -------------- |
| desktop-1440 | 1440 × 900 |
| desktop-1280 | 1280 × 800 |
| desktop-1024 | 1024 × 768 |
| mobile-390 | 390 × 844 |

## Unauthenticated matrix

| Route | 1440 | 1280 | 1024 | mobile | Notes |
| ----- | ---- | ---- | ---- | ------ | ----- |
| `/` | ✅ | ✅ | ✅ | ✅ | No horizontal overflow; home smoke PASS |
| `/login/candidate` | ✅ | ✅ | ✅ | ✅ | Email + credential path visible |
| `/status` | ✅ | ✅ | ✅ | ✅ | HTTP 200; Playwright status row flaky (cookie banner strict mode) |
| `/workspace/candidate/jobs` | ✅ | ✅ | ✅ | ✅ | Redirects toward login when logged out |
| `/profile` | ✅ | ✅ | ✅ | ✅ | HTTP 200 logged-out |

Legend: ✅ = HTTP OK + no document horizontal scroll at viewport.

## Authenticated routes (founder manual)

| Route | Status | Notes |
| ----- | ------ | ----- |
| `/dashboard` | **PENDING** | Requires session; use `docs/CANDIDATE_E2E_MANUAL_SMOKE_2026-05-27.md` |
| `/dashboard/*` subpages | **PENDING** | Rail layout — verify at 1440/1280/1024/mobile with real account |
| `/workspace/candidate/jobs` (logged in) | **PENDING** | Discovery shell — founder visual pass |

## Playwright prod smoke (2026-05-29)

- **24 passed**, **1 failed** (`/status` strict-mode locator vs cookie-consent title — test hygiene, not layout break).
- Command: `PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test e2e/smoke.spec.ts`

## Verdict

- **Public/unauth responsive:** **PASS** (no h-scroll on checked routes).
- **Authenticated dashboard responsive:** **PENDING** founder credentials.
