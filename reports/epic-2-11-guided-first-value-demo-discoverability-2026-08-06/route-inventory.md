# Epic 2.11 — Candidate route inventory + empty-state dispositions

Date: 2026-08-06  
Branch: `cursor/phase1-monorepo-scaffold`  
Primary IA count: **7** (unchanged; no 8th nav)

## Primary destinations (N/N complete)

| # | Area | Route | Empty disposition | Empty wired |
|---|------|-------|-------------------|-------------|
| 1 | home | `/dashboard` | actionable | GuidedFirstValueEntry + Home |
| 2 | direction | `/dashboard/career` | actionable | IaActionableEmpty |
| 3 | opportunities | `/dashboard/matches` | actionable | IaActionableEmpty |
| 4 | evidence | `/dashboard/portfolio` | actionable | IaActionableEmpty (when empty) |
| 5 | plan | `/dashboard/execution-calendar` | actionable | IaActionableEmpty |
| 6 | decisions | `/dashboard/approvals` | positive_empty | IaActionableEmpty |
| 7 | settings | `/dashboard/privacy-center` | actionable | IaActionableEmpty |

Complete: **7/7**

## Secondary (keep_secondary — not empty-contract primary)

Help / Report / Feedback, profile, jobs, strategy modules, calendar sync, consent, history, identity — disposition secondary or hidden_chrome per `CANDIDATE_ROUTE_DISPOSITION`.

## Contracts

- `starter_path_v1`
- `actionable_empty_state_v1`
- `isolated_demo_v1`
- `pilot_first_value_v1` (unchanged; no v2)
- `mechanical_discoverability_v1`

## Rules preserved

- loading ≠ empty; error ≠ empty; positive empty OK
- Tour ≠ first value
- Public preview `READY_INACTIVE` (code ready, not enabled in prod)
- DEMO mode kpi_excluded; zero canonical writes
