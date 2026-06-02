# S2 CSP burn-in window — 2026-06-01

## Window metadata

- Burn-in start UTC: `2026-06-02T07:06:17Z`
- 72h target end UTC: `2026-06-05T07:06:17Z`
- Production URL: `https://twin-sooty.vercel.app`
- CSP mode: `Content-Security-Policy-Report-Only` (RO)
- Narrowed CSP on prod: **LIVE** (explicit allowlists, no broad `https:` wildcards)
- S2 status: **STARTED**
- S2 PASS: **NO**
- Public launch: **NO-GO**

## Header audit (read-only, no auth/cookies)

Source checks:
- `bash scripts/audit-csp-headers.sh`
- Manual `curl -sI` for 8 routes

| Route | HTTP | CSP-RO present | CSP enforce present | `report-uri` present | Narrowed policy live |
| --- | --- | --- | --- | --- | --- |
| `/` | 200 | yes | no | yes | yes |
| `/dashboard` | 200 | yes | no | yes | yes |
| `/login/candidate` | 200 | yes | no | yes | yes |
| `/register/candidate` | 200 | yes | no | yes | yes |
| `/demo` | 200 | yes | no | yes | yes |
| `/status` | 200 | yes | no | yes | yes |
| `/dashboard/calendar` | 200 | yes | no | yes | yes |
| `/api/public-health` | 200 | yes | no | yes | yes |

Enforce header check: **not present** on all routes.

## Public-health snapshot (read-only)

From `GET /api/public-health` (via FE alias), captured at burn-in start:

| Field | Value |
| --- | --- |
| `status` | `ok` |
| `db_ok` | `true` |
| `validated_jobs` | `652` |
| `market_coverage_active_validated` | `2579` |
| `worker_active` | `null` |
| `broker_configured` | `null` |

## Required evidence list before founder decision (6)

- 1) Burn-in start + end timestamps and immutable header audit evidence for the 8 routes.
- 2) Railway log triage for full 72h (`csp_report violation` cadence + hourly rollup + unique `blocked-uri` list).
- 3) False-positive triage decisions (extensions/bots/dev-noise) with explicit include/exclude rationale.
- 4) Multi-browser DevTools checklist (Chrome, Safari, Firefox, mobile Safari, mobile Chrome) completed on required routes.
- 5) Founder demo dry-run evidence on the same alias with pass/fail notes and any CSP anomalies.
- 6) Founder sign-off line (HOLD report-only / approve enforce PR) after reviewing logs + DevTools pack.

## Guardrails

- Do **not** enable enforce mode in this window.
- Do **not** claim S2 PASS during this window.
- Public launch remains **NO-GO** until founder decision after evidence review.
