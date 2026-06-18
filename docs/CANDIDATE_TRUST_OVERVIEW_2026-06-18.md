# Candidate Trust Overview — 2026-06-18

**Branch:** `product/candidate-trust-overview-2026-06-18`  
**Routes:** `/dashboard/trust/overview` (primary), `/profile/trust/overview` (alias)

## Purpose

Candidate-facing **trust overview index** — links all nine trust modules with timeline, downloadable records summary, pending actions, and safety boundaries. Read-only/demo/pilot only.

## Page sections (8)

| # | Section | Marker |
| - | ------- | ------ |
| 1 | Header | `candidate-trust-overview-header` |
| 2 | Trust module map | `candidate-trust-overview-module-map` |
| 3 | Data control timeline | `candidate-trust-overview-timeline` |
| 4 | Downloadable records | `candidate-trust-overview-downloadable-records` |
| 5 | Pending / planned actions | `candidate-trust-overview-pending-actions` |
| 6 | Safety boundaries | `candidate-trust-overview-safety-boundaries` |
| 7 | Recommended next action | `candidate-trust-overview-recommended-next` |
| 8 | Linked modules | `candidate-trust-overview-linked-modules` |

## Tests

```bash
cd frontend
npm run test:candidate-trust-overview
PLAYWRIGHT_ENABLE_BROWSER_TESTS=1 PLAYWRIGHT_ENABLE_WEBSERVER=1 npm run test:candidate-trust-overview-browser
```

Prod smoke:

```bash
PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app npm run test:candidate-trust-overview-browser
```
