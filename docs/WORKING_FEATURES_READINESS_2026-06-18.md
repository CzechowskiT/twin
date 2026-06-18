# Working Features Readiness — 2026-06-18

**Branch:** `product/board-working-features-readiness-2026-06-18`  
**Route:** `/board/working-features-readiness`

## Purpose

Internal board matrix mapping demo/pilot surfaces to future working features with backend and security dependencies — no activation claims.

## Sections

| Marker | Section |
| ------ | ------- |
| `working-features-readiness-header` | Header |
| `working-features-readiness-candidate-matrix` | Candidate pilot→working |
| `working-features-readiness-recruiter-matrix` | Recruiter pilot→working |
| `working-features-readiness-company-matrix` | Company pilot→working |
| `working-features-readiness-investor-matrix` | Investor proof→live |
| `working-features-readiness-backend` | Backend dependencies |
| `working-features-readiness-risk-order` | Risk order |
| `working-features-readiness-implementation` | Implementation order |
| `working-features-readiness-launch` | Launch stance |

## Tests

```bash
cd frontend
npm run test:working-features-readiness
PLAYWRIGHT_ENABLE_BROWSER_TESTS=1 PLAYWRIGHT_ENABLE_WEBSERVER=1 npm run test:working-features-readiness-browser
```

Prod smoke:

```bash
PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app npm run test:working-features-readiness-browser
```
