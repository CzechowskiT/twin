# PRODUCT LIVE MATRIX — 2026-07-14

> **Canonical.** Supersedes `PUBLIC_LAUNCH_FUNCTIONALITY_INVENTORY_2026-07-13.md` for module status tracking.
> **Stance:** Launch NO-GO · Gate F PENDING · P0 CLOSED

## Deploy alignment

| Field | Value |
|-------|-------|
| repo_head | 9cb96e30 |
| prod_frontend_commit | 9cb96e30 |
| prod_api_commit | ae14bfb5 |
| db_revision | 077 |
| alignment_status | ALIGNED |
| generated_utc | 2026-07-14T05:49:19.503Z |

## Product live summary

| Metric | Count |
|--------|-------|
| LIVE | 30 |
| PILOT | 54 |
| PREVIEW | 3 |
| COMING_SOON | 3 |
| PAUSED | 2 |
| INTERNAL | 9 |
| GREEN_WORKING | 30 |
| Visible in hub | 92 |
| Total modules | 101 |

## Legend

| Status | Meaning |
|--------|---------|
| LIVE | GREEN_WORKING — smoke-verified MVP scope |
| PILOT | Visible, persistence shipped, honest pilot badge |
| PILOT_PENDING_SMOKE | Persistence shipped — founder browser smoke pending |
| PREVIEW | Read-only / invite-only shell |
| BLOCKED | COMING_SOON / PAUSED — hard-ban or not shipped |
| INTERNAL | Hidden from hub — security-sensitive |
| NOT IMPLEMENTED | No route or API — not in registry |

## Candidate workspace

| Module | Route | Repo | Prod | Green | Visible | Next action |
|--------|-------|------|------|-------|---------|-------------|
| candidate_panel | /dashboard | LIVE | LIVE (repo=9cb96e30) | yes | yes | Maintain — regression smoke. |
| candidate_applications | /dashboard/applications | LIVE | LIVE (repo=9cb96e30) | yes | yes | Maintain — regression smoke. |
| plan_payments | /dashboard/billing | INTERNAL | INTERNAL | no | no | Schedule activation wave. |
| candidate_calendar | /dashboard/calendar | LIVE | LIVE (repo=9cb96e30) | yes | yes | Maintain — regression smoke. |
| candidate_career_compass | /dashboard/career | LIVE | LIVE (repo=9cb96e30) | yes | yes | Wave B complete — monitor prod persistence; no mutation smoke on demo@twin.career. |
| career_compass | /dashboard/career | LIVE | LIVE (repo=9cb96e30) | yes | yes | Wave B complete — monitor prod persistence; no mutation smoke on demo@twin.career. |
| candidate_cv | /dashboard/cv | LIVE | LIVE (repo=9cb96e30) | yes | yes | Maintain — regression smoke. |
| candidate_evidence | /dashboard/evidence | LIVE | LIVE (repo=9cb96e30) | yes | yes | Maintain — regression smoke. |
| candidate_identity | /dashboard/identity | LIVE | LIVE (repo=9cb96e30) | yes | yes | Maintain — regression smoke. |
| candidate_interview_prep | /dashboard/interview-prep | LIVE | LIVE (repo=9cb96e30) | yes | yes | Maintain — regression smoke. |
| candidate_jobs | /dashboard/jobs | LIVE | LIVE (repo=9cb96e30) | yes | yes | Maintain — regression smoke. |
| candidate_matches | /dashboard/matches | LIVE | LIVE (repo=9cb96e30) | yes | yes | Maintain — regression smoke. |
| candidate_plan | /dashboard/plan | INTERNAL | INTERNAL | no | no | Schedule activation wave. |
| candidate_referrals | /dashboard/referrals | LIVE | LIVE (repo=9cb96e30) | yes | yes | Wave B complete — referrals read-only smoke PASS on prod. |
| referrals | /dashboard/referrals | LIVE | LIVE (repo=9cb96e30) | yes | yes | Wave B complete — referrals read-only smoke PASS on prod. |
| candidate_trust | /dashboard/trust | LIVE | LIVE (repo=9cb96e30) | yes | yes | Wave B complete — trust subs load on prod; mutation smoke excluded for demo account. |
| trust_center | /dashboard/trust | LIVE | LIVE (repo=9cb96e30) | yes | yes | Wave B complete — trust hub + subs verified on prod. |
| candidate_trust_audit_export | /dashboard/trust/audit-export | PILOT | PILOT (repo=9cb96e30) | no | yes | Schedule activation wave. |
| candidate_consent_receipt | /dashboard/trust/consent-receipt | PILOT | PILOT (repo=9cb96e30) | no | yes | Schedule activation wave. |
| candidate_control_center | /dashboard/trust/controls | PILOT | PILOT (repo=9cb96e30) | no | yes | Schedule activation wave. |
| candidate_correction_request | /dashboard/trust/corrections | PILOT | PILOT (repo=9cb96e30) | no | yes | Schedule activation wave. |
| candidate_export_preview | /dashboard/trust/export-preview | PILOT | PILOT (repo=9cb96e30) | no | yes | Schedule activation wave. |
| candidate_identity_verification | /dashboard/trust/identity-verification | PILOT | PILOT (repo=9cb96e30) | no | yes | Schedule activation wave. |
| candidate_trust_overview | /dashboard/trust/overview | PILOT | PILOT (repo=9cb96e30) | no | yes | Schedule activation wave. |
| candidate_data_portability | /dashboard/trust/portability | PILOT | PILOT (repo=9cb96e30) | no | yes | Schedule activation wave. |
| candidate_revoke_delete | /dashboard/trust/revoke-delete | INTERNAL | INTERNAL | no | no | Schedule activation wave. |
| auto_apply | /dashboard#auto-apply-readiness | INTERNAL | INTERNAL | no | no | Not in first slices. |
| candidate_profile | /profile | LIVE | LIVE (repo=9cb96e30) | yes | yes | Maintain — regression smoke. |

## Recruiter workspace

| Module | Route | Repo | Prod | Green | Visible | Next action |
|--------|-------|------|------|-------|---------|-------------|
| recruiter_hub | /recruiter | INTERNAL | INTERNAL | no | no | Schedule activation wave. |
| recruiter_analytics | /recruiter/analytics | LIVE | LIVE (repo=9cb96e30) | yes | yes | Maintain — regression smoke. |
| recruiter_calendar | /recruiter/calendar | BLOCKED | BLOCKED | no | yes | Wave F — MS/Google calendar after core green. |
| recruiter_demo_profile_360 | /recruiter/candidates/demo-candidate-001 | PILOT | PILOT (repo=9cb96e30) | no | yes | Schedule activation wave. |
| recruiter_demo_collaboration | /recruiter/candidates/demo-candidate-001/collaboration | PILOT | PILOT (repo=9cb96e30) | no | yes | Schedule activation wave. |
| recruiter_demo_communication | /recruiter/candidates/demo-candidate-001/communication | PILOT | PILOT (repo=9cb96e30) | no | yes | Schedule activation wave. |
| recruiter_demo_decision_memory | /recruiter/candidates/demo-candidate-001/decision-memory | PILOT | PILOT (repo=9cb96e30) | no | yes | Schedule activation wave. |
| recruiter_demo_team | /recruiter/candidates/demo-candidate-001/team | PILOT | PILOT (repo=9cb96e30) | no | yes | Schedule activation wave. |
| recruiter_demo_trust | /recruiter/candidates/demo-candidate-001/trust | PILOT | PILOT (repo=9cb96e30) | no | yes | Schedule activation wave. |
| recruiter_daily_cockpit | /recruiter/daily-cockpit | PILOT_PENDING_SMOKE | PILOT_PENDING_SMOKE (repo=9cb96e30) | no | yes | Wave C slice 1 shipped — run founder smoke on /recruiter with pilot token. |
| daily_cockpit | /recruiter/daily-cockpit | PILOT_PENDING_SMOKE | PILOT_PENDING_SMOKE (repo=9cb96e30) | no | yes | Wave C slice 1 shipped — run founder smoke on /recruiter with pilot token. |
| recruiter_inbox | /recruiter/inbox | LIVE | LIVE (repo=9cb96e30) | yes | yes | Maintain — regression smoke. |
| recruiter_integrations | /recruiter/integrations | BLOCKED | BLOCKED | no | yes | Wave F — integrations after core personas green. |
| integrations | /recruiter/integrations | BLOCKED | BLOCKED | no | yes | Wave F — recruiter integrations activation. |
| recruiter_ats_import_readiness | /recruiter/integrations/ats/import-readiness | INTERNAL | INTERNAL | no | no | Schedule activation wave. |
| recruiter_jobs | /recruiter/jobs | LIVE | LIVE (repo=9cb96e30) | yes | yes | Maintain — regression smoke. |
| recruiter_demo_pipeline | /recruiter/jobs/demo-role-001/pipeline | PILOT | PILOT (repo=9cb96e30) | no | yes | Schedule activation wave. |
| recruiter_operational_work_queue | /recruiter/operational-work-queue | INTERNAL | INTERNAL | no | no | Schedule activation wave. |
| recruiter_pipeline | /recruiter/pipeline | LIVE | LIVE (repo=9cb96e30) | yes | yes | Maintain — regression smoke. |
| recruiter_search | /recruiter/search | LIVE | LIVE (repo=9cb96e30) | yes | yes | Maintain — regression smoke. |
| recruiter_talent_pool | /recruiter/talent-pool | PILOT_PENDING_SMOKE | PILOT_PENDING_SMOKE (repo=9cb96e30) | no | yes | Wave C slice 2 shipped — run founder smoke on /recruiter/talent-pool with pilot token. |
| talent_pool | /recruiter/talent-pool | PILOT_PENDING_SMOKE | PILOT_PENDING_SMOKE (repo=9cb96e30) | no | yes | Wave C slice 2 shipped — run founder smoke on /recruiter/talent-pool with pilot token. |
| recruiter_talent_pool_import | /recruiter/talent-pool/import | PILOT | PILOT (repo=9cb96e30) | no | yes | Schedule activation wave. |
| recruiter_talent_radar | /recruiter/talent-radar | PILOT | PILOT (repo=9cb96e30) | no | yes | Schedule activation wave. |
| talent_radar | /recruiter/talent-radar | PILOT | PILOT (repo=9cb96e30) | no | yes | Schedule activation wave. |
| recruiter_talent_radar_digest | /recruiter/talent-radar/digest | PILOT | PILOT (repo=9cb96e30) | no | yes | Schedule activation wave. |
| talent_radar_digest | /recruiter/talent-radar/digest | PILOT | PILOT (repo=9cb96e30) | no | yes | Schedule activation wave. |
| recruiter_trust_review_queue | /recruiter/trust-review-queue | PILOT_PENDING_SMOKE | PILOT_PENDING_SMOKE (repo=9cb96e30) | no | yes | Wave C slice 2 shipped — run founder smoke on /recruiter/trust-review-queue with pilot token. |
| trust_review_queue | /recruiter/trust-review-queue | PILOT_PENDING_SMOKE | PILOT_PENDING_SMOKE (repo=9cb96e30) | no | yes | Wave C slice 2 shipped — run founder smoke on /recruiter/trust-review-queue with pilot token. |

## Company workspace

| Module | Route | Repo | Prod | Green | Visible | Next action |
|--------|-------|------|------|-------|---------|-------------|
| company_billing | /company/billing | INTERNAL | INTERNAL | no | no | Post-launch — billing after Gate F. |
| billing | /company/billing | BLOCKED | BLOCKED | no | yes | Post-launch billing. |
| company_demo_profile_360 | /company/candidates/demo-candidate-001 | PILOT | PILOT (repo=9cb96e30) | no | yes | Schedule activation wave. |
| company_demo_collaboration | /company/candidates/demo-candidate-001/collaboration | PILOT | PILOT (repo=9cb96e30) | no | yes | Schedule activation wave. |
| company_demo_communication | /company/candidates/demo-candidate-001/communication | PILOT | PILOT (repo=9cb96e30) | no | yes | Schedule activation wave. |
| company_demo_decision_memory | /company/candidates/demo-candidate-001/decision-memory | PILOT | PILOT (repo=9cb96e30) | no | yes | Schedule activation wave. |
| company_demo_team | /company/candidates/demo-candidate-001/team | PILOT | PILOT (repo=9cb96e30) | no | yes | Schedule activation wave. |
| company_demo_trust | /company/candidates/demo-candidate-001/trust | PILOT | PILOT (repo=9cb96e30) | no | yes | Schedule activation wave. |
| company_candidate_trust_summary | /company/candidates/demo-candidate-001/trust-summary | PILOT | PILOT (repo=9cb96e30) | no | yes | Schedule activation wave. |
| company_dashboard | /company/dashboard | LIVE | LIVE (repo=9cb96e30) | yes | yes | Maintain — regression smoke. |
| company_hiring_cockpit | /company/hiring-cockpit | PILOT | PILOT (repo=9cb96e30) | no | yes | Schedule activation wave. |
| hiring_cockpit | /company/hiring-cockpit | PILOT | PILOT (repo=9cb96e30) | no | yes | Schedule activation wave. |
| company_hiring_command_center | /company/hiring-command-center | PILOT | PILOT (repo=9cb96e30) | no | yes | Schedule activation wave. |
| hiring_command_center | /company/hiring-command-center | PILOT | PILOT (repo=9cb96e30) | no | yes | Schedule activation wave. |
| company_integrations | /company/integrations | BLOCKED | BLOCKED | no | yes | Wave F — company integrations. |
| company_ats_import_readiness | /company/integrations/ats/import-readiness | INTERNAL | INTERNAL | no | no | Schedule activation wave. |
| company_pipeline | /company/pipeline | LIVE | LIVE (repo=9cb96e30) | yes | yes | Maintain — regression smoke. |
| company_roles | /company/roles | LIVE | LIVE (repo=9cb96e30) | yes | yes | Maintain — regression smoke. |
| company_demo_pipeline | /company/roles/demo-role-001/pipeline | PILOT | PILOT (repo=9cb96e30) | no | yes | Schedule activation wave. |
| company_talent_pool | /company/talent-pool | PILOT | PILOT (repo=9cb96e30) | no | yes | Schedule activation wave. |
| company_team | /company/team | PILOT | PILOT (repo=9cb96e30) | no | yes | Schedule activation wave. |
| team | /company/team | PILOT | PILOT (repo=9cb96e30) | no | yes | Schedule activation wave. |

## Investor workspace

| Module | Route | Repo | Prod | Green | Visible | Next action |
|--------|-------|------|------|-------|---------|-------------|
| audit_event_foundation | /board/audit-event-foundation | PILOT | PILOT (repo=9cb96e30) | no | yes | Schedule activation wave. |
| first_working_persistence_plan | /board/first-working-persistence-plan | PILOT | PILOT (repo=9cb96e30) | no | yes | Schedule activation wave. |
| board_implementation_tracker | /board/implementation-tracker | PILOT | PILOT (repo=9cb96e30) | no | yes | Schedule activation wave. |
| production_persistence_status | /board/production-persistence-status | PILOT | PILOT (repo=9cb96e30) | no | yes | Schedule activation wave. |
| working_data_readiness | /board/working-data-readiness | PILOT | PILOT (repo=9cb96e30) | no | yes | Schedule activation wave. |
| working_features_readiness | /board/working-features-readiness | PILOT | PILOT (repo=9cb96e30) | no | yes | Schedule activation wave. |
| investor_demo | /demo | PILOT | PILOT (repo=9cb96e30) | no | yes | Schedule activation wave. |
| investor_public_room | /investor | LIVE | LIVE (repo=9cb96e30) | yes | yes | Maintain — regression smoke. |
| investor_calculator | /investor/calculator | LIVE | LIVE (repo=9cb96e30) | yes | yes | Maintain — regression smoke. |
| investor_data_room | /investor/data-room | PREVIEW | PREVIEW (repo=9cb96e30) | no | yes | Wave E — data room access control + asset links. |
| data_room | /investor/data-room | PREVIEW | PREVIEW (repo=9cb96e30) | no | yes | Wave E — data room activation. |
| investor_metrics | /investor/metrics | LIVE | LIVE (repo=9cb96e30) | yes | yes | Maintain — regression smoke. |
| investor_placement | /investor/placement | PILOT | PILOT (repo=9cb96e30) | no | yes | Schedule activation wave. |
| placement | /investor/placement | PILOT | PILOT (repo=9cb96e30) | no | yes | Schedule activation wave. |
| investor_product_proof | /investor/product-proof | LIVE | LIVE (repo=9cb96e30) | yes | yes | Maintain — regression smoke. |
| investor_roadmap | /investor/roadmap | LIVE | LIVE (repo=9cb96e30) | yes | yes | Maintain — regression smoke. |
| investor_trust_proof | /investor/trust-proof | PILOT | PILOT (repo=9cb96e30) | no | yes | Schedule activation wave. |
| login | /login/investor | PREVIEW | PREVIEW (repo=9cb96e30) | no | yes | Wave E — investor auth persistence. |
| investor_sor_proof_collaboration | /recruiter/candidates/demo-candidate-001/collaboration | PILOT | PILOT (repo=9cb96e30) | no | yes | Schedule activation wave. |
| investor_sor_proof_ats | /recruiter/integrations/ats/import-readiness | PILOT | PILOT (repo=9cb96e30) | no | yes | Schedule activation wave. |
| investor_sor_proof_pipeline | /recruiter/jobs/demo-role-001/pipeline | PILOT | PILOT (repo=9cb96e30) | no | yes | Schedule activation wave. |
| investor_workspace_hub | /workspace/investor | LIVE | LIVE (repo=9cb96e30) | yes | yes | Maintain — regression smoke. |

## Public marketing routes

| Route | Status | Notes |
|-------|--------|-------|
| / | LIVE | Homepage + demo CTA |
| /demo | LIVE | Interactive walkthrough (#462) |
| /for-candidates | LIVE | Persona marketing |
| /for-recruiters | LIVE | Persona marketing |
| /for-companies | LIVE | CTAs → /company/dashboard, /company/talent-pool, /company/integrations |
| /for-investors | LIVE | Fundraising lane |
| /waitlist | LIVE | Signup form |
| /status | LIVE | Public health mirror |

## Superseded

- `docs/PUBLIC_LAUNCH_FUNCTIONALITY_INVENTORY_2026-07-13.md` — module rows superseded by this matrix
- `docs/PRODUCTION_REALITY_MATRIX_2026-05-27.md` — historical; see this doc for current module status

## Source

- Registry: `frontend/src/lib/all-workspace-modules-activation.ts`
- Generator: `frontend/scripts/generate-product-live-matrix.ts`
