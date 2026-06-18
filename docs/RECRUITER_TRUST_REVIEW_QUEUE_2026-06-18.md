# Recruiter Trust Review Queue — 2026-06-18

**Branch:** `product/recruiter-trust-review-queue-2026-06-18`  
**Route:** `/recruiter/trust-review-queue`

## Purpose

Read-only recruiter queue aggregating candidate trust/control demo events for human review — no approvals, email, or outreach.

## Sections

| Marker | Section |
| ------ | ------- |
| `recruiter-trust-review-queue-header` | Header |
| `recruiter-trust-review-queue-summary` | Queue summary |
| `recruiter-trust-review-queue-table` | Candidate requests |
| `recruiter-trust-review-queue-priority` | Review priority |
| `recruiter-trust-review-queue-evidence` | Evidence bundle |
| `recruiter-trust-review-queue-suggested` | Suggested actions |
| `recruiter-trust-review-queue-boundary` | Human boundary |
| `recruiter-trust-review-queue-linked-modules` | Linked modules |

## Tests

```bash
cd frontend
npm run test:recruiter-trust-review-queue
PLAYWRIGHT_ENABLE_BROWSER_TESTS=1 PLAYWRIGHT_ENABLE_WEBSERVER=1 npm run test:recruiter-trust-review-queue-browser
```

Prod smoke:

```bash
PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app npm run test:recruiter-trust-review-queue-browser
```
