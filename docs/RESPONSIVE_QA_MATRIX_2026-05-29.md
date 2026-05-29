# Responsive QA matrix — 2026-05-29

**Target:** `https://twin-sooty.vercel.app` (prod alias)  
**Method:** Playwright viewport script (unauthenticated) + HTTP status + `e2e/smoke.spec.ts` against prod  
**Auth dashboard subpages:** not exercised by Playwright (no credentials in agent session). Founder authenticated template **2026-05-29: PENDING** (empty paste — see evidence doc).

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

Evidence owner: `docs/FOUNDER_AUTHENTICATED_SMOKE_EVIDENCE_2026-05-29.md`. **Do not mark PASS** until founder fills per-route results + viewport notes.

| Route | Responsive (1440/1280/1024/mobile) | Functional / copy | Notes |
| ----- | ---------------------------------- | ------------------- | ----- |
| `/dashboard` | **PENDING** | **PENDING** | 2026-05-29 template empty |
| `/dashboard/billing` | **PENDING** | **PENDING** | |
| `/dashboard/settings/auto-apply` | **PENDING** | **PENDING** | No Run now / live sweep click |
| `/dashboard/identity` | **PENDING** | **PENDING** | No KYC overclaim |
| `/dashboard/career` | **PENDING** | **PENDING** | |
| `/dashboard/calendar` | **PENDING** | **PENDING** | Integrations + empty week UX |
| `/workspace/candidate/jobs` (logged in) | **PENDING** | **PENDING** | Discovery shell |
| `/profile` | **PENDING** | **PENDING** | |
| Readiness blocks auto-apply when incomplete | — | **PENDING** | Founder safety row |
| No live delegated/KYC/guaranteed apply copy | — | **PENDING** | Founder safety row |

## Playwright prod smoke (2026-05-29)

- **24 passed**, **1 failed** (`/status` strict-mode locator vs cookie-consent title — test hygiene, not layout break).
- Command: `PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test e2e/smoke.spec.ts`

## Verdict

- **Public/unauth responsive:** **PASS** (no h-scroll on checked routes).
- **Authenticated dashboard responsive + functional:** **PENDING — AWAITING FOUNDER INPUT** (2026-05-29; empty smoke template).
