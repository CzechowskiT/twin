# Verified Candidate Gateway — technical readiness audit

**Date:** 2026-05-28  
**Branch:** `cursor/phase1-monorepo-scaffold`  
**Mode:** Read-only product + codebase audit, no runtime mutation  
**Scope:** Candidate verification architecture readiness for pilot progression  

## Executive verdict

The Verified Candidate Gateway is directionally strong and mostly aligned with TWIN's "calendar of acceptance" north star, but it is still **pilot-grade** rather than scale-ready. The core design principles are in place (machine-assisted verification, append-only event trail, idempotent transitions, and exception-based human escalation), with partial backend implementation and supporting tests. The current status is **GO for controlled pilot hardening**, **NO-GO for mass launch claims**.

## Audit method and safety constraints

- Reviewed repository architecture docs and implementation paths only.
- Cross-checked production-readiness matrices and prior CTO audit outputs.
- Did not execute any banned action:
  - no live apply/auto-apply
  - no scrape or batch job submission
  - no CAPTCHA bypass
  - no prod deploy, migration, or env mutation
  - no secrets handling

## Product-technology alignment check

### 1) North-star alignment (calendar of acceptance)

**Status: PARTIAL-GOOD**

- Verification direction is explicitly machine-assisted and in-product.
- Architecture avoids manual "CS tennis" as default operating mode.
- Candidate/recruiter workflow is designed around stateful acceptance readiness.
- Remaining gap: stronger production evidence that placement verification outcomes are feeding acceptance calendar moments at measurable frequency.

### 2) Verification model quality

**Status: GOOD (design), PARTIAL (runtime depth)**

- Layered approach exists in design:
  - candidate self-declaration
  - work-email proof path
  - partner/attestation and webhook-oriented progression
  - retention checks scheduled by date-driven tasks
- Correct anti-pattern avoidance is documented (no default employer chasing, no primary manual loops).
- Production maturity is still constrained by pilot usage scale.

### 3) State machine + eventing readiness

**Status: PARTIAL-GOOD**

- State machine semantics are documented and coherent:
  - `pipeline` -> `offer_reported` -> `verification_pending` -> `placement_verified`
  - explicit failure/dispute states
- Append-only event intent is documented and reflected in placement-oriented implementation paths.
- Remaining gap: more explicit state-transition contract tests covering invalid/edge transition graphs in one matrix.

### 4) Security and abuse posture

**Status: PARTIAL**

- Existing security posture is acceptable for controlled pilot with guardrails.
- No evidence in this audit of secret exposure in verification docs/code paths.
- Remaining work before wider rollout:
  - fuller anti-abuse and fraud-signal regression suite
  - stricter production observability coverage for verification flow failures

### 5) Operational readiness

**Status: PARTIAL**

- Read-only production health discipline is in place.
- Smoke/checklist process quality is high and repeatable.
- Gaps:
  - consistency of production SHA evidence across docs
  - clear and recent mapping from verification states to business KPI surfaces

## Current capability matrix (verified candidate gateway)

| Capability | Readiness | Notes |
| --- | --- | --- |
| In-product verification strategy | READY (pilot) | Strong design docs and architecture direction |
| Append-only verification/event orientation | PARTIAL | Implemented directionally; further contract tests needed |
| Candidate-first consentful verification UX intent | READY (design) | Well-defined non-spam operating model |
| Employer/partner attestation model | PARTIAL | Defined; production depth still growing |
| Retention/milestone automation model | PARTIAL | Design exists; requires broader evidence at runtime |
| Fraud/dispute exception queue philosophy | READY (design) | Correctly exception-based, not default manual loop |
| Scale-level launch confidence | NOT READY | Pilot-safe only, not mass-launch-safe |

## Risks and constraints (2026-05-28)

1. **Evidence-to-claim drift risk**  
   Gateway architecture may be over-interpreted as fully scale-ready without equivalent runtime proof.

2. **State-contract incompleteness risk**  
   Missing transition-level negative/edge matrices can hide invalid state moves.

3. **Ops observability granularity risk**  
   Pilot checks are present, but verification-specific operational dashboards still need tightening.

4. **Business-trigger coupling risk**  
   Commercial trigger confidence depends on state machine correctness and consistent event auditability.

## Recommended low-risk next slices

1. Add a consolidated verification state-transition contract test matrix (backend, targeted pytest).
2. Add no-secret and no-PII assertions for verification-adjacent error responses.
3. Add source-of-truth table mapping verification states -> user-visible messaging -> billing eligibility semantics.
4. Keep all production checks read-only and capture SHA drift evidence in one canonical document.

## Read-only evidence sources used

- `docs/PLACEMENT_VERIFICATION.md`
- `docs/PRODUCTION_REALITY_MATRIX_2026-05-27.md`
- `docs/CTO_PRODUCT_TECH_AUDIT_2026-05-26.md`
- `docs/AUTONOMOUS_WORKLOG_2026-05-28.md`
- `docs/AUTONOMOUS_ENGINEER_SYSTEM_2026-05-28.md`

## Final readiness call

- **Controlled pilot hardening:** **GO**
- **Public scale claim / broad launch:** **NO-GO**
- **Autonomous safety compliance in this slice:** **PASS**

