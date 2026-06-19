# Company Hiring Command Center — 2026-06-19

**Branch:** `product/company-hiring-command-center-2026-06-19`  
**Route:** `/company/hiring-command-center`

## Purpose

Pilot hiring manager command view aggregating role readiness, shortlist, feedback, decision blockers, trust boundaries, team tasks, and meeting readiness — with explicit disabled actions (approve, reject, request interview, message recruiter, export/share).

## Sections

| Marker | Section |
| ------ | ------- |
| `company-hiring-command-center-header` | Header |
| `company-hiring-command-center-role-readiness` | Role readiness |
| `company-hiring-command-center-shortlist` | Shortlist |
| `company-hiring-command-center-pending-feedback` | Pending feedback |
| `company-hiring-command-center-decision-blockers` | Decision blockers |
| `company-hiring-command-center-trust-boundaries` | Trust boundaries |
| `company-hiring-command-center-hiring-team-tasks` | Hiring team tasks |
| `company-hiring-command-center-next-meeting-readiness` | Next meeting / readiness |
| `company-hiring-command-center-boundary-panel` | Boundary panel (disabled actions) |

Card components do **not** forward `data-testid` — markers live on inner divs.

## Tests

```bash
cd frontend
npm run test:company-hiring-command-center
npm run test:company-hiring-team-cockpit
npm run test:company-candidate-trust-summary
PLAYWRIGHT_ENABLE_BROWSER_TESTS=1 PLAYWRIGHT_ENABLE_WEBSERVER=1 npm run test:company-hiring-command-center-browser
```

Prod smoke:

```bash
PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app npm run test:company-hiring-command-center-browser
```
