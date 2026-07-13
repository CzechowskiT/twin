# All workspace modules — activation master plan (2026-07-10)

> **Supersedes:** `ALL_WORKSPACE_MODULES_GREEN_PLAN_2026-07-09.md` and Wave 1–3 green-only docs.  
> **Stance:** P0 CLOSED | Gate E PASS | Gate F PENDING | Launch NO-GO

## Summary

Restore **full product surface visibility** with honest activation statuses. Activate modules wave-by-wave to **GREEN_WORKING**. Launch remains **NO-GO** until all modules pass E2E smoke.

**Registry:** `frontend/src/lib/all-workspace-modules-activation.ts`

---

## Execution waves

### Wave A — Restore visibility (this PR)
- Disable `WORKSPACE_GREEN_ONLY_MODE`
- Hub sections: Core LIVE, Extended, Pilot/Preview, Coming Soon/Paused
- Restore trust center, integrations, investor modules to hubs
- New guards + founder decision doc

### Wave B — Candidate activation
- **Slice 1 (shipped):** Career Compass full persistence — see `docs/ALL_MODULES_GREEN_WAVE_B1_CAREER_COMPASS_2026-07-10.md` (PILOT until founder browser smoke)
- **Slice 2 (shipped):** Trust Center persistence + consent receipts — see `docs/ALL_MODULES_GREEN_WAVE_B2_CANDIDATE_TRUST_CENTER_2026-07-10.md` (PILOT until founder browser smoke)
- **Slice 3 (in progress):** Referrals persistence — see `docs/ALL_MODULES_GREEN_WAVE_B3_CANDIDATE_REFERRALS_2026-07-10.md` (PILOT until founder browser smoke)
- Founder smoke runbook — see `docs/CANDIDATE_GREEN_MODULES_FOUNDER_SMOKE_2026-07-10.md`

### Wave C — Recruiter activation
- **Slice 1 (shipped):** Recruiter workspace activation onboarding — see `docs/ALL_MODULES_GREEN_WAVE_C1_RECRUITER_ACTIVATION_2026-07-13.md` (PILOT until founder browser smoke)
- **Slice 2 (shipped):** Talent Pool + Trust Review Queue persistence — see `docs/ALL_MODULES_GREEN_WAVE_C2_TALENT_POOL_TRUST_REVIEW_2026-07-13.md` (PILOT until founder browser smoke)
- Integration readiness PRs #448–#450 — see `docs/INTEGRATION_READINESS_PR448_449_450_2026-07-13.md`
- Founder smoke handoff (env, order, routes) — `docs/FOUNDER_SMOKE_HANDOFF_PR448_449_450_2026-07-13.md`
- **Slice 3 (PR #448 OPEN):** Candidate referrals persistence — migration `073_candidate_referrals` (rebase after #450)
- Demo collaboration → production paths

### Wave D — Company activation
- Hiring Cockpit, Command Center, Team permissions
- Talent Pool employer view

### Wave E — Investor activation
- Login auth persistence
- Data Room access control
- Placement verification demo → pilot

### Wave F — Cross-persona integrations
- Recruiter/Company integrations (no ATS writeback yet)
- Calendar sync (Google first; MS after)
- **Excluded from Wave B slice 1**

### Wave G — Full E2E smoke
- Per-module smoke runbook
- Cross-persona acceptance calendar flow

### Wave H — Founder acceptance
- Gate F review
- Launch decision (still NO-GO until all green)

---

## First implementation slice (plan only — not code in Wave A PR)

| Field | Value |
|-------|-------|
| Module | **Candidate Career Compass** (`candidate_career_compass`) |
| Why | Highest candidate value, lowest risk vs auto-apply/billing |
| Goal | Full persistence — goals, gaps, learning priorities survive sessions |
| FE | Wire `/dashboard/career` to persistence API |
| BE | Career compass CRUD endpoints + PostgreSQL |
| Auth | Candidate JWT |
| Effort | M |
| Wave | B slice 1 |

### Excluded from first slice

Auto-apply (PAUSED / INTERNAL), delegated apply, Stripe checkout, ATS writeback, Microsoft calendar sync — **not in Wave B slice 1**.

---

## Module inventory by workspace

### Candidate (22 visible SoR + workspace cards)

| ID | Route | Status | Green | Section |
|----|-------|--------|-------|---------|
| candidate_panel | /dashboard | LIVE | yes | core |
| candidate_profile | /dashboard/profile | LIVE | yes | core |
| candidate_cv | /dashboard/cv | LIVE | yes | core |
| candidate_jobs | /dashboard/jobs | LIVE | yes | core |
| candidate_matches | /dashboard/matches | LIVE | yes | core |
| candidate_applications | /dashboard/applications | LIVE | yes | core |
| candidate_calendar | /dashboard/calendar | LIVE | yes | core |
| candidate_identity | /dashboard/identity | LIVE | yes | core |
| candidate_evidence | /dashboard/evidence | LIVE | yes | core |
| candidate_interview_prep | /dashboard/interview-prep | LIVE | yes | core |
| candidate_career_compass | /dashboard/career | PILOT | no | extended |
| candidate_trust | /dashboard/trust | PILOT | no | pilot_preview |
| candidate_control_center | /dashboard/trust/controls | PILOT | no | pilot_preview |
| candidate_export_preview | /dashboard/trust/export-preview | PILOT | no | pilot_preview |
| candidate_correction_request | /dashboard/trust/corrections | PILOT | no | pilot_preview |
| candidate_identity_verification | /dashboard/trust/identity-verification | PILOT | no | pilot_preview |
| candidate_data_portability | /dashboard/trust/portability | PILOT | no | pilot_preview |
| candidate_trust_audit_export | /dashboard/trust/audit-export | PILOT | no | pilot_preview |
| candidate_consent_receipt | /dashboard/trust/consent-receipt | PILOT | no | pilot_preview |
| candidate_trust_overview | /dashboard/trust/overview | PILOT | no | pilot_preview |
| candidate_referrals | /dashboard/referrals | PILOT | no | pilot_preview |
| candidate_plan | /dashboard/billing | INTERNAL | no | internal |
| candidate_revoke_delete | /dashboard/trust/revoke-delete | INTERNAL | no | internal |
| auto_apply | /dashboard#auto-apply-readiness | PAUSED | no | internal |

### Recruiter (24 visible)

| ID | Route | Status | Green | Section |
|----|-------|--------|-------|---------|
| recruiter_inbox | /recruiter/inbox | LIVE | yes | core |
| recruiter_pipeline | /recruiter/pipeline | LIVE | yes | core |
| recruiter_jobs | /recruiter/jobs | LIVE | yes | core |
| recruiter_search | /recruiter/search | LIVE | yes | core |
| recruiter_analytics | /recruiter/analytics | LIVE | yes | core |
| recruiter_trust_review_queue | /recruiter/trust-review-queue | PILOT | no | pilot_preview |
| recruiter_daily_cockpit | /recruiter/daily-cockpit | PILOT | no | pilot_preview |
| recruiter_talent_pool | /recruiter/talent-pool | PILOT | no | pilot_preview |
| recruiter_talent_radar | /recruiter/talent-radar | PILOT | no | pilot_preview |
| recruiter_talent_radar_digest | /recruiter/talent-radar/digest | PILOT | no | pilot_preview |
| recruiter_demo modules | various | PILOT | no | extended |
| recruiter_integrations | /recruiter/integrations | COMING SOON | no | coming_soon_paused |
| recruiter_calendar | /recruiter/calendar | PAUSED | no | coming_soon_paused |
| recruiter_hub | /recruiter | INTERNAL | no | internal |
| recruiter_operational_work_queue | /recruiter/operational-work-queue | INTERNAL | no | internal |

### Company (17 visible + 1 internal)

| ID | Route | Status | Green | Section |
|----|-------|--------|-------|---------|
| company_dashboard | /company/dashboard | LIVE | yes | core |
| company_roles | /company/roles | LIVE | yes | core |
| company_pipeline | /company/pipeline | LIVE | yes | core |
| company_hiring_cockpit | /company/hiring-cockpit | PILOT | no | pilot_preview |
| company_hiring_command_center | /company/hiring-command-center | PILOT | no | pilot_preview |
| company_team | /company/team | PILOT | no | pilot_preview |
| company_talent_pool | /company/talent-pool | PILOT | no | pilot_preview |
| company_integrations | /company/integrations | COMING SOON | no | coming_soon_paused |
| company_demo modules | various | PILOT | no | extended |
| company_billing | /company/billing | PAUSED | no | internal |

### Investor (19 SoR entries visible)

| ID | Route | Status | Green | Section |
|----|-------|--------|-------|---------|
| investor_metrics | /investor/metrics | LIVE | yes | core |
| investor_roadmap | /investor/roadmap | LIVE | yes | core |
| investor_calculator | /investor/calculator | LIVE | yes | core |
| investor_product_proof | /investor/product-proof | LIVE | yes | core |
| investor_data_room | /investor/data-room | PREVIEW | no | pilot_preview |
| investor_placement | /investor/placement | PILOT | no | pilot_preview |
| investor_trust_proof | /investor/trust-proof | PILOT | no | pilot_preview |
| login | /login/investor | PREVIEW | no | pilot_preview |
| board evidence (6) | /board/* | PILOT | no | pilot_preview collapsed |
| demo proof (4) | /demo, proof routes | PILOT | no | extended |

---

## Status breakdown (all workspaces)

| Status | Count (approx) |
|--------|----------------|
| LIVE | 22 |
| PILOT | 45 |
| PREVIEW | 3 |
| COMING SOON | 3 |
| PAUSED | 3 |
| INTERNAL | 8 |

---

## Superseded guards

| Guard | Status |
|-------|--------|
| test:all-workspace-modules-green-wave1-guard | Superseded — historical |
| test:all-workspace-modules-green-wave2a-guard | Superseded |
| test:all-workspace-modules-green-wave2b-* | Superseded |
| test:all-workspace-modules-green-wave3-* | Superseded |
| test:product-surface-visibility-guard | Updated for activation |
| test:system-of-record-navigation-hub | Updated for activation sections |

## New guards

- test:all-workspace-modules-visible-guard
- test:all-workspace-modules-activation-plan-guard
- test:all-modules-green-wave-b1-career-compass-guard
- test:all-modules-green-wave-c1-recruiter-activation-guard
- test:candidate-green-modules-founder-smoke-guard
