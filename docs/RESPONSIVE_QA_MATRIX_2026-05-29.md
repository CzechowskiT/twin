# Responsive QA matrix — 2026-05-29

**Target:** `https://twin-sooty.vercel.app` (prod alias)  
**Method:** Playwright viewport script (unauthenticated) + HTTP status + `e2e/smoke.spec.ts` against prod  
**Auth dashboard subpages:** founder screenshots 2026-05-29 (`docs/FOUNDER_AUTHENTICATED_SMOKE_EVIDENCE_2026-05-29.md`)

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

## Authenticated routes (founder manual — 2026-05-29)

| Route | Responsive (1440/1280/1024/mobile) | Functional / copy | Notes |
| ----- | ---------------------------------- | ------------------- | ----- |
| `/dashboard` | **PENDING re-verify** (desktop) — prior FAIL: forecast CTA overlap; fix **deployed** `3631c45` | Blocked prepare copy OK | Founder must confirm full-width forecast section on prod |
| `/dashboard/billing` | **PASS** | PASS | Wide layout; subnav visible |
| `/dashboard/settings/auto-apply` | **PASS** | PASS | No Run now |
| `/dashboard/identity` | **PASS** | PASS | No KYC overclaim |
| `/dashboard/career` | **PASS** | PASS | |
| `/dashboard/calendar` | **PASS** | **PASS** | Google **FULL prod smoke PASS** 2026-05-29 — connected, real events, day mapping OK (`Europe/Warsaw`); Microsoft connected |
| `/workspace/candidate/jobs` (logged in) | **PASS** | PASS | Long scroll OK |
| `/profile` | **PASS** | PASS | Long profile OK |
| Readiness blocks auto-apply when incomplete | — | **PASS** | |
| No live delegated/KYC/guaranteed apply copy | — | **PASS** | |

## Playwright prod smoke (2026-05-29)

- **24 passed**, **1 failed** (`/status` strict-mode locator vs cookie-consent — **fixed on branch** 2026-05-29).
- Command: `PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test e2e/smoke.spec.ts`

## Verdict

- **Public/unauth responsive:** **PASS** (no h-scroll on checked routes).
- **Authenticated dashboard responsive:** **PARTIAL** — `/dashboard` **PENDING founder re-verify** after layout fix deploy; other listed routes **PASS**.
