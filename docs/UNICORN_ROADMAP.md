# TWIN unicorn-scale roadmap (canonical, evidence-based)

**Date:** 2026-07-20  
**Branch baseline:** `cursor/phase1-monorepo-scaffold`  
**Capability map (status truth):** [`docs/CANONICAL_PRODUCT_CAPABILITY_MAP.md`](./CANONICAL_PRODUCT_CAPABILITY_MAP.md)  
**Workspace smoke catalog:** [`docs/PRODUCT_LIVE_MATRIX_2026-07-14.md`](./PRODUCT_LIVE_MATRIX_2026-07-14.md)  

## Stance (locked — do not flip in docs-only batches)

| Gate | Value |
|------|-------|
| P0 | **CLOSED** |
| Gate E (Phase 3B harness) | Historical **PASS 20/20** (attempt 19) |
| Phase 3B ops re-runs | **BLOCKED** without founder auth — **not flipped** |
| Gate F | **PENDING** |
| Launch | **NO-GO** |
| Pilot | **BLOCKED_BY_FOUNDER** |
| PMF evidence | **INSUFFICIENT_DATA** |
| real_candidate_enrollment | **NOT_STARTED** |
| real_recruiter_enrollment | **NOT_STARTED** |
| Funnel instrumentation | **LIVE** — PR [#523](https://github.com/CzechowskiT/twin/pull/523) |
| Activation TTV proof | **LIVE** (flag-gated) — PR [#524](https://github.com/CzechowskiT/twin/pull/524) |
| Activation cohort registry | **LIVE infra** (#526 / Alembic 086) — **no real invites** |
| Deploy alignment (baseline) | **ALIGNED** @ `9a889a8e…` (Wave 1 #528; public-health) |
| Candidate Wave 1 | **PARTIAL→DONE trust LIVE** — auth smoke PASS; **6** trust modules **LIVE**; export/identity **PARTIAL**; cand_* still pending; policy holds unchanged |
| Productionization | [`FULL_PRODUCT_PRODUCTIONIZATION_PLAN.md`](./FULL_PRODUCT_PRODUCTIONIZATION_PLAN.md) · Hard LIVE [`HARD_LIVE_DEFINITION_30.md`](./HARD_LIVE_DEFINITION_30.md) |

**This roadmap does not flip Gate F / Launch / Phase 3B / Pilot enrollment.**

## Executive posture

TWIN has a real MVP surface (candidate matches + applications + Google calendar + recruiter inbox) plus **LIVE** funnel/activation instrumentation (#523/#524/#526 registry). **Founder hard block:** external pilot is **BLOCKED_BY_FOUNDER** until **all user-facing modules** meet Hard LIVE 30 — do **not** recruit real users, do **not** recommend Gate F PASS, do **not** declare PMF. Moat candidates remain: acceptance-ready calendar loop + placement verification state machine. Enterprise Deal Intelligence (Karwatka) stays **P2–P3**.

**Dates for all required user-facing modules LIVE** (velocity model in productionization plan; Wave 1 trust LIVE slice 2026-07-20): optimistic **2026-10-19** · realistic **2027-01-19** · conservative **2027-07-05**.

**Sole prioritized roadmap:** this file. `docs/PRODUCT_ROADMAP.md` is historical context only.

---

## Priority legend (selective)

| Pri | Meaning | Rule |
|-----|---------|------|
| P0 | Safe operation / founder decision gates | Few items; already mostly CLOSED |
| P1 | PMF proof (activation → acceptance) | Brutal focus |
| P2 | Repeatable monetization / sales OS / key integrations | After P1 signal |
| P3 | Enterprise scale (SSO, SCIM, full EDI ML) | After logos + data |
| P4 | Optional / deferred / REJECTED revisit | Agency marketplace etc. |

---

## Done (do not reopen as implementation)

| Item | Pri | Evidence | Continue/stop |
|------|-----|----------|---------------|
| Product funnel + cohort retention | P0→DONE | PR #523, Alembic 084, `/admin/funnel` | Maintain; stop expanding events until cohort has N≥20 |
| Activation TTV auto-match + UX | P0→DONE | PR #524, Alembic 085 | Flag-gated; rollback via `ACTIVATION_TTV_OPS_ROLLBACK_2026-07-20.md` |
| Core candidate LIVE hubs | — | Capability map LIVE rows | Regression only |
| Core recruiter LIVE hubs | — | Inbox/pipeline/jobs/search/analytics + C1–C5 | Pilot token; no open self-serve yet |
| Core company LIVE hubs | — | Dashboard/roles/pipeline | Maintain |
| Investor public room LIVE | — | Metrics/roadmap/calculator/product-proof | Maintain |

---

## Horizon A — 0–30 days

| Item | Pri | Impact | Cost | Risk | Deps | Measurable result | LIVE / exit criteria | Owner | Continue/stop |
|------|-----|--------|------|------|------|-------------------|----------------------|-------|---------------|
| **Activation Cohort Fill** (20–50 PL desk candidates + 3–5 recruiters) | **P1** | High | M | Trust/PII | #523/#524/#526 LIVE infra | ≥20 signups with `onboarding_completed`; ≥10 `first_match` | **HOLD** — Pilot **BLOCKED_BY_FOUNDER**; registry only | Founder + growth | **Stop invites** until all user-facing modules LIVE per productionization plan |
| Founder Gate F decision record | P0 | High | Docs | Org | Evidence pack | Gate F YES/NO signed | Decision file updated | Founder | Stop public growth marketing if NO |
| Wire interview/placement funnel emits | P1 | High | S | Low | schedule/verify APIs | Events on real interview/placement | Staging events visible | Product | Continue |
| Trust PILOT → smoke (export, corrections, identity verification, portability, consent receipt, control center, overview, audit export) | P1 | Med | M | Privacy | Wave B | Founder mutation smoke PASS on non-demo account | Each module → LIVE or stay PILOT with date | candidate-squad | Stop if DSR gaps |
| Recruiter GO SMALL 1/2 (H5) external invites | P1 | High | M | Trust | H5d pack | Dual-side decisions/week | Founder GO signed | Founder | Stop if incidents |
| **EDI-0 first experiment** (see epic) | P2 | High learning | S | Process | Founder pipeline | 100% open enterprise opps have EB + named rival + next paid date | Sheet/CRM hygiene 2 weeks | Founder-sales | Stop building EDI product if <50% compliance |

---

## Horizon B — 31–90 days

| Item | Pri | Modules / scope | Deps | Measurable | LIVE criteria | Owner | Continue/stop |
|------|-----|-----------------|------|------------|---------------|-------|---------------|
| Company depth | P1 | `company_hiring_cockpit`, `company_hiring_command_center`, `company_talent_pool`, `company_team` (PILOT) | Core company LIVE | Weekly company active roles | Prod smoke + persistence | company-squad | Stop if unused |
| Company RBAC real | P2 | `rec_role_permissions`, `rec_team_mgmt`, personas hiring_manager/employer_admin | Team PILOT | Invites work with audit | Invites enabled + permission enforced | company-squad | Stop if security review fails |
| Recruiter discovery | P2 | `recruiter_talent_radar*`, `recruiter_talent_pool_import` | Talent pool LIVE | Import→shortlist rate | Smoke PASS | recruiter-squad | Stop if low usage |
| Demo/SoR lanes | P2 | All `*_demo_*`, `investor_sor_proof_*`, `rec_collaboration`, `rec_candidate_comms` | — | Demo conversion | Stay DEMO_ONLY/PILOT honestly | product | Do not claim LIVE |
| Investor diligence | P2 | `investor_data_room`, `investor_login`, board `working_*`, `audit_event_foundation`, `investor_placement`, `investor_trust_proof` | — | Diligence requests served | Auth + assets or remain PARTIAL | founder/investor-lane | Stop overclaim |
| Microsoft calendar candidate | P2 | `cand_ms_calendar` LIVE_BEHIND_FLAG | Graph gates | Corporate users connect | Flags on + tests + Gate F consideration | platform | Stop if OAuth fail rate high |
| ICS/WebCal complete | P2 | `plat_ics_webcal` | Calendar | Subscribe usage | Documented subscribe URL | platform | Keep |
| Candidate polish | P2 | `cand_preferences`, `cand_match_explanation`, `cand_notifications`, `cand_feedback`, `cand_availability`, `cand_cv_*`, `cand_mobile`, `cand_a11y` | Matching | ↑ match accept rate | Spec per module | candidate-squad | Selective |
| Placement self-serve | P1 | `cand_verified_placement`, `rec_placement_verification`, `edi_verified_placement_econ` | Placement SM | Verified placements/qtr | Self-serve path without CS tennis | ops + product | Stop CS ping-pong default |
| Monetization soft | P2 | `plan_payments`, `candidate_plan`, `cand_premium`, `company_billing*`, `rec_subscription` PAUSED | Launch GO | Paid intent | **No live Stripe public until Launch GO** | product | Hold while NO-GO |
| Auto-apply reopen decision | P2 | `auto_apply` INTERNAL/PAUSED | Policy | — | Explicit founder GO | Founder | Default remain paused |
| Scrapers coverage | P2 | `plat_job_boards` PARTIAL | Beat ON | `validated_jobs` ↑ | Coverage KPI | ops | Stop boards that poison quality |

---

## Horizon C — 3–12 months

| Item | Pri | Modules | Measurable | LIVE criteria | Owner | Continue/stop |
|------|-----|---------|------------|---------------|-------|---------------|
| Integrations Wave F | P2 | `recruiter_calendar` BLOCKED, `recruiter_integrations` BLOCKED, `company_integrations` BLOCKED, `rec_ats_sync`, `rec_vacancy_import`, `*_ats_import_readiness`, `plat_webhooks_ats` | 1 live webhook employer | Hard-ban lifted + smoke | platform | Expand only on NRR |
| Marketplace liquidity | P0→P1 | Dual-side loops | Weekly matched acceptances | Liquidity dashboard | product | Pivot if one-sided |
| Paid plans live | P2 | Stripe public | MRR + payback | Launch GO + checklist | product | Stop if LTV/CAC <1 |
| EDI product hiring OS | P2–P3 | `edi_hiring_*`, `edi_cost_of_vacancy`, `rec_sla_tracking`, `rec_approvals` | Stalled hires closed | Employer adoption | product | Only after cohort PMF |
| Enterprise security | P3 | `rec_sso`, `rec_scim`, `rec_enterprise_security`, `rec_procurement`, `plat_enterprise_framework`, `rec_company_verification` | ACV logos | Security review | platform | — |
| Full EDI sales OS | P3 | Remaining `edi_*` internal | Win rate ↑ | Playbook closes without founder | founder-sales | — |
| Multi-geo | P3 | — | New geo NS | Local ICP proof | growth | Stop if PL NS flat |

---

## Horizon D — 12–36 months

| Item | Pri | Notes | Continue/stop |
|------|-----|-------|---------------|
| Data/AI moat models | P3–P4 | Only after labeled win/loss + placement volume | **Forbidden** to claim moat earlier |
| Category brand (acceptance calendar) | P4 | Narrative after proof | — |
| Unicorn economics | — | NRR>120%, liquidity | Only if unit economics hold |

---

## Epic: Enterprise Deal Intelligence (Karwatka)

**Source:** [Enterprise Deals. Every One We Lost…](https://tomaszkarwatka.substack.com/p/enterprise-deals-every-one-we-lost)  
**Do not implement the whole epic in this batch.**  
**Earliest high time-to-learning experiment (EDI-0):** for every open enterprise opportunity, require three fields before meeting two — (1) economic buyer named + meeting scheduled Y/N, (2) named rival (incl. status quo / in-house), (3) next **paid** commitment date — and run close-the-file if stalled >14 days. Owner: Founder. Horizon: A. Pri: **P2**. Success: ≥80% opps complete in 14 days; learning doc published. **No ML.**

| # | Capability | Class | Status | Pri | Horizon | Owner | LIVE criteria | Deps | Measurable | Continue/stop |
|---|------------|-------|--------|-----|---------|-------|---------------|------|------------|---------------|
| 1 | Economic Buyer Graph | internal sales | NOT_BUILT | P2 | A–B | founder-sales | EB on 100% opps | EDI-0 | % with EB | Stop if unused |
| 2 | Meeting One Qualification | internal sales | NOT_BUILT | P2 | A | founder-sales | Checklist used meeting 1 | EDI-0 | Qual pass rate | Continue |
| 3 | Money Business Case Builder | shared | NOT_BUILT | P2 | B | founder-sales | 3 numbers + client correction | #2 | Cases/quarter | Continue |
| 4 | Cost of Status Quo / Delay | shared | NOT_BUILT | P2 | B | founder-sales | In every case | #3 | Client-owned numbers | Continue |
| 5 | Named Rival + Battle Cards | internal sales | NOT_BUILT | P2 | A–B | founder-sales | Rival named | EDI-0 | % with rival | Continue |
| 6 | Paid Commitment Ladder | internal sales | NOT_BUILT | P3 | C | founder-sales | Workshop→POC→license prices public | Stripe policy | Paid steps | Hold if Launch NO-GO |
| 7 | POC→License Contract | internal sales | NOT_BUILT | P3 | C | founder-sales | Written success→subscribe | #6 | Conversion % | Continue |
| 8 | Momentum Score | shared | NOT_BUILT | P3 | C | founder-sales | Score from actions | EDI-0 data | Score↔win correl | Stop if no signal |
| 9 | Zombie Deal Detection | internal sales | NOT_BUILT | P3 | C | founder-sales | Auto flag >14d stall | #8 | Zombies closed | Continue |
| 10 | Founder Intervention Trigger | internal sales | NOT_BUILT | P3 | C | Founder | Trigger rules | #8 | Time saved | Continue |
| 11 | One-page Champion Pack | internal sales | NOT_BUILT | P2 | B | founder-sales | Pack used in board | #3 | Pack attach rate | Continue |
| 12 | Win/Loss Intelligence | data product | NOT_BUILT | P3 | C–D | product | Structured loss reasons | Closed deals | Learning loop | No moat claim early |
| 13 | Next Paid Commitment | internal sales | NOT_BUILT | P2 | A | founder-sales | Date on every opp | EDI-0 | % with date | Continue |
| 14 | Hiring Business Case | product | NOT_BUILT | P2 | C | product | Employer-facing case | PMF | Employer adoption | After liquidity |
| 15 | Cost of Vacancy | product | NOT_BUILT | P2 | C | product | Vacancy $ shown | #14 | Corrections | After data |
| 16 | Hiring Process Momentum | product | NOT_BUILT | P2 | C | product | Stall close UX | Recruiter LIVE | Stalls closed/wk | After pilot |
| 17 | Verified Placement Economics | shared | PARTIAL | P1 | B–C | ops | Self-serve verified fee path | Placement SM | Verified/qtr | Stop CS tennis |

**Rejected from EDI productization now:** agency multi-client marketplace as EDI vehicle (see capability map REJECTED).

---

## Non-LIVE module index → epic (enforceable)

Every non-LIVE id from the capability map maps to an epic below. REJECTED ids are listed once.

### Trust & GDPR completion (P1–P2)
`candidate_consent_receipt`, `candidate_control_center`, `candidate_correction_request`, `candidate_data_portability`, `candidate_export_preview`, `candidate_identity_verification`, `candidate_trust_audit_export`, `candidate_trust_overview`, `candidate_revoke_delete`, `cand_account_deletion`, `ops_privacy_dsr`, `plat_identity_kyc`, `rec_audit_log`  
Owner: candidate-squad / ops · Horizon B · Continue if DSR incidents=0

### Integrations Wave F (P2)
`recruiter_calendar`, `recruiter_integrations`, `company_integrations`, `recruiter_ats_import_readiness`, `company_ats_import_readiness`, `rec_vacancy_import`, `rec_ats_sync`, `rec_interview_scheduling`, `cand_ms_calendar`, `plat_webhooks_ats`, `plat_ics_webcal`  
Owner: platform · Horizon B–C · Stop if hard-ban still required

### Monetization post Launch GO (P2)
`plan_payments`, `candidate_plan`, `company_billing`, `company_billing_public_claim`, `cand_premium`, `rec_subscription`, `rec_usage_limits`  
Owner: product · **Hold public Stripe while Launch NO-GO**

### Auto-apply policy (P2)
`auto_apply` · Owner: Founder · Default **PAUSED** · Continue only on explicit GO

### Company workspace depth (P1–P2)
`company_hiring_cockpit`, `company_hiring_command_center`, `company_talent_pool`, `company_team`, `rec_company_onboarding`, `rec_team_mgmt`, `rec_role_permissions`, `persona_hiring_manager`, `persona_employer_admin`, `persona_company_owner`  
Owner: company-squad · Horizon B

### Recruiter discovery + pilot (P1–P2)
`recruiter_talent_pool_import`, `recruiter_talent_radar`, `recruiter_talent_radar_digest`, `rec_recruiter_onboarding`, `recruiter_hub`, `recruiter_operational_work_queue`, `rec_notes`, `rec_scorecards`, `rec_matching`, `rec_hiring_funnel_analytics`  
Owner: recruiter-squad · Horizon A–B

### Demo / SoR proof (P2 — stay honest)
`recruiter_demo_*`, `company_demo_*`, `company_candidate_trust_summary`, `investor_demo`, `investor_sor_proof_*`, `rec_collaboration`, `rec_candidate_comms`  
Owner: product · Do **not** promote to LIVE without real-user persistence

### Investor / board readiness (P2)
`investor_data_room`, `investor_login`, `investor_placement`, `investor_trust_proof`, `audit_event_foundation`, `board_implementation_tracker`, `first_working_persistence_plan`, `production_persistence_status`, `working_data_readiness`, `working_features_readiness`  
Owner: founder/investor-lane · Horizon B

### Candidate activation & quality (P1–P2)
`cand_signup`, `cand_cv_import`, `cand_cv_parsing`, `cand_preferences`, `cand_match_explanation`, `cand_availability`, `cand_notifications`, `cand_feedback`, `cand_verified_placement`, `cand_mobile`, `cand_a11y`, `cand_activation_ttv` (flag maintain)  
Owner: candidate-squad · Horizon A–B

### Founder / ops internal (maintain INTERNAL_ONLY)
`founder_command`, `product_agent`, `ops_admin_metrics`, `ops_partner_keys`, `ops_recruiter_tokens`, `ops_placements_admin`, `ops_incident`, `plat_partner_api`, `plat_public_api`, `plat_observability`, `plat_job_boards`  
Owner: ops · Not public LIVE targets

### Enterprise Deal Intelligence (P2–P3)
All `edi_*`, `sales_pipeline_edi`, `plat_crm`, `rec_sla_tracking`, `rec_approvals`, `rec_procurement`  
Owner: founder-sales / product · Start with **EDI-0** only

### Enterprise readiness (P3)
`rec_sso`, `rec_scim`, `rec_enterprise_security`, `rec_company_verification`, `plat_enterprise_framework`  
Owner: platform · After paying logos

### Support / safety (P3–P4)
`support_tooling`, `persona_support`, `moderation` · Owner: ops · NOT_BUILT

### Agency deferred / REJECTED (P4)
`agency_*`, `persona_agency_recruiter`, `persona_agency_owner`, `agency_marketplace` (**REJECTED**)  
Owner: growth · **Stop** until PL desk PMF; marketplace REJECTED

### Sales persona (P2 via EDI, not marketing film)
`persona_sales` NOT_BUILT · covered by EDI sales OS · Owner: founder-sales

---

## Continue / stop meta-rules

1. **Empty cohort → stop feature sprawl** until Activation Cohort Fill produces learning.
2. **Launch NO-GO → no public Stripe / no ATS live-sync claims.**
3. **No AI moat language** until proprietary labeled datasets exist (see capability map Layer 3).
4. **Every new surface** must reduce noise toward acceptance-ready calendar items — or it is out of order.
5. **EDI product for employers** only after recruiter/candidate liquidity; EDI-0 for Founder sales can start now.

---

## Related

- [`docs/CANONICAL_PRODUCT_CAPABILITY_MAP.md`](./CANONICAL_PRODUCT_CAPABILITY_MAP.md) — status truth  
- [`docs/PRODUCT_METRICS.md`](./PRODUCT_METRICS.md) — funnel/NS  
- [`docs/ACTIVATION_TTV_OPS_ROLLBACK_2026-07-20.md`](./ACTIVATION_TTV_OPS_ROLLBACK_2026-07-20.md)  
- [`docs/PLACEMENT_VERIFICATION.md`](./PLACEMENT_VERIFICATION.md)  
- [`docs/FEATURE_FLAG_REGISTRY_2026-07-13.md`](./FEATURE_FLAG_REGISTRY_2026-07-13.md)
