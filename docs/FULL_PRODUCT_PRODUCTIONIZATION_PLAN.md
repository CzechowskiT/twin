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

**~100 in-scope modules × calendar:**

| Scenario | Weeks | Calendar from 2026-07-20 |
|----------|------:|--------------------------|
| Optimistic | ~13 | **~2026-10-19** |
| Realistic | ~25 | **~2027-01-12** |
| Conservative | ~50 + policy buffer | **~2027-07-05** |

Policy blockers (Stripe public, ATS live-sync, auto-apply reopen, MS calendar write) can slip conservative further until Founder GO.

**Founder condition met earliest (all required user-facing LIVE):**  
optimistic **2026-10-19** · realistic **2027-01-12** · conservative **2027-07-05**.

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
- [ ] PR CI green + merge + prod smoke + map recalibration (evidence in PR)

## 10. Next batch after Wave 0

**Wave 1 Candidate complete** — see consolidated report “Next recommended batch” prompt.
