# Full Product Surface Productionization Plan

**Date:** 2026-07-20  
**Branch baseline:** `cursor/phase1-monorepo-scaffold` @ `f9b792fd` (post-#526)  
**Canon:** [`CANONICAL_PRODUCT_CAPABILITY_MAP.md`](./CANONICAL_PRODUCT_CAPABILITY_MAP.md) · [`UNICORN_ROADMAP.md`](./UNICORN_ROADMAP.md) · [`HARD_LIVE_DEFINITION_30.md`](./HARD_LIVE_DEFINITION_30.md)  
**Decision record:** [`PILOT_FOUNDER_BLOCK_DECISION_2026-07-20.md`](./PILOT_FOUNDER_BLOCK_DECISION_2026-07-20.md)

## 1. Founder stance (hard — do not soften)

| Field | Value |
|-------|-------|
| Pilot | **BLOCKED_BY_FOUNDER** |
| Gate F | **PENDING** (do not PASS) |
| Launch | **NO-GO** |
| PMF evidence | **INSUFFICIENT_DATA** |
| real_candidate_enrollment | **NOT_STARTED** |
| real_recruiter_enrollment | **NOT_STARTED** |
| P0 | **CLOSED** |
| Phase 3B | Gate E historical PASS; ops **BLOCKED** — not flipped |
| Auto-apply | **PAUSED** |
| Stripe public | **not LIVE** |
| ATS live-sync | **BLOCKED** |

**Reason:** Founder requires **all user-facing modules** for required personas to be truly production-grade **LIVE** before external pilot. Cohort registry/analytics/readiness (#526) may remain **behind flags** — **do not invite real users**.

**Immediately stop:** cohort recruitment of real people, candidate/recruiter activation for pilot, claiming pilot readiness sufficient, recommending Gate F PASS.

## 2. Inventory (re-audit 2026-07-20)

| Source | Count |
|--------|------:|
| Capability map rows | **195** |
| LIVE | **43** |
| LIVE_BEHIND_FLAG | **2** |
| PILOT | **45** |
| PARTIAL | **27** |
| INTERNAL_ONLY | **17** |
| DEMO_ONLY | **2** |
| PAUSED | **2** |
| BLOCKED | **7** |
| NOT_BUILT | **47** |
| REJECTED | **3** |
| Non-LIVE (excl. REJECTED) | **149** |
| Frontend `page.tsx` routes | **~235** |
| Alembic head (pre-Wave-0) | **086** |

### Personas in scope for Founder LIVE bar

| Persona | Decision | User-facing LIVE bar |
|---------|----------|----------------------|
| candidate | KEEP | All user-facing modules must reach LIVE |
| recruiter | KEEP | All user-facing modules must reach LIVE |
| company | KEEP | All user-facing modules must reach LIVE |
| investor / board | KEEP | Diligence surfaces must reach LIVE (honest INTERNAL for ops) |
| referrer | KEEP (candidate growth) | Referral LIVE already; deepen with Wave 1 |
| partner | INTERNAL_ONLY API | Not external pilot |
| ops / Founder | INTERNAL | Not pilot bar |
| agency / support / sales EDI | REJECTED or NOT_BUILT | **Out of pilot bar** until Founder reopens |

### Estimated modules still needing LIVE for Founder condition

| Bucket | Approx modules | Notes |
|--------|---------------:|-------|
| Candidate non-LIVE user-facing | ~29 | PILOT trust + PARTIAL polish + INTERNAL privacy |
| Recruiter non-LIVE user-facing | ~27 | PILOT depth + DEMO + BLOCKED calendar/integrations |
| Company non-LIVE user-facing | ~34 | PILOT depth + NOT_BUILT RBAC/EDI + BLOCKED ATS/billing |
| Investor non-LIVE | ~11 | PILOT diligence + PARTIAL |
| Policy-held (Stripe/ATS/auto-apply) | ~8 | Require separate Founder policy GO |
| **Total to LIVE (in-scope)** | **~100** | Excludes REJECTED agency + pure sales-OS NOT_BUILT |

## 3. Velocity basis (honest)

Observed recent cadence on this monorepo (Cursor agents + 1 founder reviewer):

| Slice type | Historical | Assumed throughput |
|------------|------------|--------------------|
| Flag-gated instrumentation (#523/#524) | 1–2 days | — |
| Workspace module wave (C1–C5 style) | ~1–3 modules / day when green | — |
| Trust/PILOT → LIVE with prod smoke | ~2–4 modules / week | bottleneck = founder smoke |
| Integrations (OAuth/ATS) | weeks + policy | not parallelize freely |

**Capacity model used for dates:**

| Scenario | Effective LIVE promotions / week | Parallelism assumption |
|----------|--------------------------------:|------------------------|
| Optimistic | **8** | 2 Cursor agents + daily founder smoke slots |
| Realistic | **4** | 1 primary agent + intermittent review |
| Conservative | **2** | Smoke/review bottleneck + policy waits |

**~100 in-scope modules × calendar (updated after Wave 1 PARTIAL — trust live-path shipped, LIVE badges deferred):**

| Scenario | Weeks | Calendar from 2026-07-20 |
|----------|------:|--------------------------|
| Optimistic | ~13 | **~2026-10-19** (if auth smoke unblocks Wave 1 LIVE within days) |
| Realistic | ~26 | **~2027-01-19** |
| Conservative | ~50 + policy buffer | **~2027-07-05** |

Policy blockers (Stripe public, ATS live-sync, auto-apply reopen, MS calendar write) can slip conservative further until Founder GO.

**Founder condition met earliest (all required user-facing LIVE):**  
optimistic **2026-10-19** · realistic **2027-01-19** · conservative **2027-07-05**.

## 4. Critical path

```
Wave 0 Foundations (identity/RBAC/tenancy/audit/events/flags/privacy/comms)
  → Wave 1 Candidate complete (trust PILOT→LIVE + PARTIAL polish)
  → Wave 2 Recruiter complete (PILOT depth + honest DEMO isolation)
  → Wave 3 Company complete (cockpits/team/RBAC; no ATS claim)
  → Wave 4 Investor diligence LIVE
  → Wave 5 Calendar/ICS portability (MS flag-gated)
  → Wave 6 Privacy/DSR completion (export/delete LIVE)
  → Wave 7 Placement self-serve + economics (no CS tennis)
  → Wave 8 Hardening + evidence pack (Gate F still Founder-only)
```

**Hard deps:** Wave 0 before RBAC invites; Wave 1 before external candidate enrollment; policy GO before Stripe/ATS LIVE claims.

## 5. Waves 0–8

| Wave | Scope | Exit | Owner |
|------|-------|------|-------|
| **0** | Foundations: identity, roles, permissions, tenancy, audit, persistence, domain events, observability, feature flags, privacy ops, export/deletion, consent, communication outbox | Migration 087+, tests, prod smoke, no LIVE badge inflation | platform |
| **1** | Candidate complete — all candidate user-facing → LIVE (or honest INTERNAL) | Capability map candidate LIVE↑ | candidate-squad |
| **2** | Recruiter complete — PILOT→LIVE; DEMO stays DEMO_ONLY | Recruiter user-facing LIVE | recruiter-squad |
| **3** | Company complete — cockpits/team/RBAC; EDI product only if scoped | Company user-facing LIVE | company-squad |
| **4** | Investor / board diligence LIVE | Investor non-LIVE → 0 (excl. INTERNAL) | founder/investor-lane |
| **5** | Integrations — MS calendar flags, ICS/WebCal; **no ATS live-sync** | Portability LIVE; ATS remains BLOCKED | platform |
| **6** | Privacy ops — export/delete/consent receipt LIVE | Trust INTERNAL→LIVE where criteria pass | candidate-squad + privacy |
| **7** | Placement verification self-serve + economics UI | Placement PARTIAL→LIVE | ops + product |
| **8** | Hardening, matrix regen, rollback drills, Gate F evidence pack | Founder may consider Gate F — **not auto-PASS** | Founder |

Monetization/Stripe public and ATS live-sync remain **outside** waves until explicit Founder policy GO (keep PAUSED/BLOCKED).

## 6. Resources

- Cursor coding agents: 1–2 concurrent PRs max (open PR budget)
- Founder: smoke + policy decisions (Gate F, Stripe, ATS, enrollment)
- No unlimited parallelism — CI + Railway + Vercel are serializing constraints

## 7. Risks

| Risk | Mitigation |
|------|------------|
| Overclaim LIVE on demos | Hard LIVE 30 + activation registry guards |
| Founder smoke backlog | Batch smoke scripts per wave |
| Policy blockers miscounted as engineering | Separate PAUSED/BLOCKED lanes |
| Scope creep (agency/EDI sales OS) | REJECTED / NOT_BUILT stay out of pilot bar |
| Recruiting while blocked | `EXTERNAL_PILOT_ENROLLMENT_ENABLED=false` |

## 8. Test / rollout / rollback

- **Test:** pytest per foundation; frontend guards; no merge on red CI
- **Rollout:** standard PR → CI → merge to scaffold → Railway BE+worker + Vercel
- **Rollback:** feature flags off; Alembic reverse only if safe; prior Vercel/Railway deploy
- **Never:** force-push, admin override, Founder Command batch for this program, invite real users

## 9. Wave 0 acceptance (this batch)

- [x] Plan + stance docs + Hard LIVE 30
- [x] Capability map / unicorn / flag registry / decision record aligned
- [x] Non-LIVE production actions gated (preview/demo/flag)
- [x] Platform foundations migration + API + tests
- [x] PR #527 CI green + merge `42c3ace5` + Railway BE+worker + Vercel + public-health smoke + enrollment-gate

## 10. Wave 1 Candidate Complete (this batch — trust LIVE slice DONE; overall PARTIAL)

- [x] Candidate surface inventory + Hard LIVE evidence registry (JSON + TS + CI guard)
- [x] Trust PILOT UIs wired to live APIs (`/trust/live-bundle`, privacy requests, consents, export.json)
- [x] Activity-timeline API alias honesty; visibility prefs ownership filter
- [x] Migration `088_candidate_wave1_hard_live` + wave1 flags + evidence seed
- [x] Backend/frontend guards + unauth prod smoke paths
- [x] Authenticated prod smoke PASS with excluded metrics account + `TWIN_PROD_SMOKE_WRITE=1` (2026-07-20)
- [x] Capability map LIVE for 6 trust modules; export/identity PARTIAL; cand_* not faked LIVE
- [x] Policy-held modules remain HELD (auto-apply, MS write, Stripe, KYC vendor, INTERNAL delete)

**Exit status:** Trust LIVE slice **DONE** (6 LIVE). Wave 1 overall **DONE_WITH_POLICY_HOLDS** after gap-close module smoke (12 Hard LIVE PASS; CV/Stripe/KYC/MS/auto-apply/delete HELD).

### Gap-close batch

- [x] Per-module smoke harness (`WAVE1_SMOKE_MODULES`, fail-closed without JWT)
- [x] Export preview live lifecycle (export.json + privacy export intake + ops queue row)
- [x] Identity = manual review status + KYC read; Authologic provider remains HELD
- [x] Authenticated per-module prod smoke PASS 6/6 @ `cf773744`
- [x] Capability map LIVE updates post-smoke; CV modules honest HELD_POLICY

**Next:** Wave 2 Recruiter complete — see consolidated report.

## 11. Wave 2 Recruiter Complete (this batch)

- [x] Recruiter surface inventory + Hard LIVE evidence registry (Wave 2 modules)
- [x] Decision memory live API (demo fixtures forbidden) + job lifecycle archive/update
- [x] Team invite dry-run (outbox draft, no real email) + communications draft-only
- [x] DEMO_ONLY isolation for demo/SoR journeys (capability map + registry)
- [x] Migration `089_recruiter_wave2_hard_live` + wave2 flags + evidence seed
- [x] `WAVE2_SMOKE_MODULES` fail-closed harness + CI guards
- [x] Policy holds unchanged: ATS / MS write / auto-apply / Stripe / Authologic / enrollment OFF
- [x] Authenticated per-module prod smoke PASS on aligned SHA (post-merge)
- [x] Capability map LIVE promotions only after smoke PASS

**Exit status:** **DONE_WITH_POLICY_HOLDS** — 20 Hard LIVE PASS; calendar/ATS/enrollment/SLA held; demo isolated DEMO_ONLY.

**Next:** Wave 3 Company Complete (no ATS claim).

## 12. Wave 3 Company Complete (this batch)

- [x] Company surface inventory + Hard LIVE evidence registry (Wave 3 modules)
- [x] Org settings live persistence + RBAC matrix (`hiring_manager` / `employer_admin`) + audit log
- [x] Scorecards live API (demo fixtures forbidden) + trust summary honesty
- [x] Team invite dry-run (outbox draft, invite delivery HELD) + notifications draft-only
- [x] Billing/integrations honesty endpoints (Stripe/ATS HELD)
- [x] DEMO_ONLY isolation for company demo journeys (capability map + registry)
- [x] Migration `090_company_wave3_hard_live` + wave3 flags + evidence seed
- [x] `WAVE3_SMOKE_MODULES` fail-closed harness + CI guards
- [x] Policy holds unchanged: ATS / MS write / auto-apply / Stripe / Authologic / enrollment OFF
- [x] Authenticated per-module prod smoke PASS on aligned SHA (post-merge)
- [x] Capability map LIVE promotions only after smoke PASS

**Exit status:** **DONE_WITH_POLICY_HOLDS** — 16 Hard LIVE PASS; ATS/Stripe/MS write/invite delivery/enrollment held; demo isolated DEMO_ONLY.

**Next:** Wave 4 Investor Complete was **not shipped**. Wave 5 Calendar & Integrations proceeds on Wave 3 HEAD.

## 13. Wave 5 Calendar & Integrations Complete (this batch)

- [x] Capability-split integration inventory (CONFIGURATION/READ/IMPORT/EXPORT/DRAFT/WRITE/SYNC/WEBHOOK/MONITORING)
- [x] ICS/WebCal portability (preview, CANCEL/STATUS/SEQUENCE/UID, WebCal mint with metrics exclusion)
- [x] Google/MS/ATS honesty endpoints — WRITE holds intact (MS HELD, ATS BLOCKED)
- [x] Email draft-only + webhook HMAC verify dry-run + CSV formula escape + storage honesty
- [x] Migration `091_integrations_wave5_hard_live` + wave5 flags + evidence seed
- [x] `WAVE5_SMOKE_MODULES` fail-closed harness + CI guards
- [x] Policy holds unchanged: ATS / MS write / auto-apply / Stripe / Authologic / enrollment OFF
- [x] Authenticated per-module prod smoke PASS on aligned SHA (post-merge)
- [x] Capability map LIVE promotions only after smoke PASS

**Exit status:** **DONE_WITH_POLICY_HOLDS** — 18 Hard LIVE PASS; MS write / ATS write-sync / Stripe / Authologic / enrollment / auto-apply held; Wave 4 noted as missing.

## 13b. Career Evidence Graph & AI Compliance Foundation (Phase A)

Alembic **092**. Production claim graph + AI registries/decision log + guards. Wave 4 remains **NOT_IMPLEMENTED**. LIVE badges only after authenticated module smoke.

**Next:** Wave 6 Privacy / DSR Complete if DONE_WITH_POLICY_HOLDS; else Gap Close. Do not start Wave 6 in this batch.

