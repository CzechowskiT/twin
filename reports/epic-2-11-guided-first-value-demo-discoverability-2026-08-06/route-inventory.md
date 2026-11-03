# Epic 2.11 — Candidate route inventory + empty-state dispositions

Date: 2026-08-06 (execution close)  
Branch: `cursor/phase1-monorepo-scaffold`  
Source: `frontend/src/lib/candidate-ia.ts` (`CANDIDATE_ROUTE_DISPOSITION` + primary IA)  
Primary IA count: **7** (unchanged; no 8th nav)

## Primary destinations + empty dispositions (7/7)

| # | Area | Route | Disposition | Empty disposition | Empty wired |
|---|------|-------|-------------|-------------------|-------------|
| 1 | home | `/dashboard` | primary | actionable | GuidedFirstValueEntry + IaActionableEmpty |
| 2 | direction | `/dashboard/career` | primary | actionable | IaActionableEmpty |
| 3 | opportunities | `/dashboard/matches` | primary | actionable | IaActionableEmpty |
| 4 | evidence | `/dashboard/portfolio` | primary | actionable | IaActionableEmpty (when empty) |
| 5 | plan | `/dashboard/execution-calendar` | primary | actionable | IaActionableEmpty |
| 6 | decisions | `/dashboard/approvals` | primary | positive_empty | IaActionableEmpty |
| 7 | settings | `/dashboard/privacy-center` | primary | actionable | IaActionableEmpty |

Primary complete: **7/7**

## Secondary / hidden (full disposition map N/N)

| Route | Disposition | Empty contract |
|-------|-------------|----------------|
| `/dashboard/help` | secondary | actionable (help catalog) |
| `/dashboard/help/report-problem` | secondary | n/a (form) |
| `/dashboard/help/feedback` | secondary | n/a (form) |
| `/profile` | secondary | keep_secondary |
| `/dashboard/jobs` | secondary | keep_secondary |
| `/dashboard/strategy` | secondary | keep_secondary |
| `/dashboard/search-strategy` | secondary | keep_secondary |
| `/dashboard/search-outcomes` | secondary | keep_secondary |
| `/dashboard/application-studio` | secondary | keep_secondary |
| `/dashboard/interview-decision` | secondary | keep_secondary |
| `/dashboard/career-transition` | secondary | keep_secondary |
| `/dashboard/review-center` | secondary | keep_secondary |
| `/dashboard/decision-journal` | secondary | keep_secondary |
| `/dashboard/execution-intelligence` | secondary | keep_secondary |
| `/dashboard/evidence-investment` | secondary | keep_secondary |
| `/dashboard/calendar` | secondary | keep_secondary |
| `/dashboard/calendar-sync` | secondary | keep_secondary |
| `/dashboard/consent-center` | secondary | keep_secondary |
| `/dashboard/history` | secondary | keep_secondary |
| `/dashboard/identity` | secondary | keep_secondary |
| `/dashboard/evidence` | secondary | keep_secondary |
| `/dashboard/applications` | secondary | keep_secondary |
| `/dashboard/lifecycle` | secondary | keep_secondary |
| `/dashboard/trust` | hidden_chrome | n/a |
| `/privacy` | secondary (nav) | marketing/legal |

Disposition rows enumerated: **primary 7 + secondary 24 + hidden 1 = 32/32** from `CANDIDATE_ROUTE_DISPOSITION` (31 map keys + `/privacy` secondary nav). Map keys in code: 31. Complete vs registry: **31/31**.

## Rules

- loading ≠ empty; error ≠ empty; positive empty OK
- Tour ≠ first value
- Public preview `READY_INACTIVE` (code ready, not enabled in prod)
- DEMO mode kpi_excluded; zero canonical writes
- No orphan primary destinations; deep links stay under progressive disclosure (More)

## Contracts

- `starter_path_v1`
- `actionable_empty_state_v1`
- `isolated_demo_v1`
- `pilot_first_value_v1` (unchanged; no v2)
- `mechanical_discoverability_v1`
