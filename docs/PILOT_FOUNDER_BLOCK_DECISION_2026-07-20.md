# Pilot Founder Block Decision — 2026-07-20

**Type:** Founder decision record (canon)  
**Supersedes for pilot timing:** scoped “controlled pilot invite” posture in older packs **only insofar as** they recommend recruiting real users or Gate F PASS before full user-facing LIVE. Cohort **registry/analytics/readiness** from #526 **kept** behind flags.

## Decision

| Field | Value |
|-------|-------|
| Pilot | **BLOCKED_BY_FOUNDER** |
| Gate F | **PENDING** |
| Launch | **NO-GO** |
| PMF evidence | **INSUFFICIENT_DATA** |
| real_candidate_enrollment | **NOT_STARTED** |
| real_recruiter_enrollment | **NOT_STARTED** |
| External enrollment flag | `EXTERNAL_PILOT_ENROLLMENT_ENABLED=false` (default) |

## Reason

Founder requires **all user-facing modules** for candidate / recruiter / company / investor (and other user-facing surfaces found in inventory) to be truly production-grade **LIVE** (see `docs/HARD_LIVE_DEFINITION_30.md`) before external pilot.

## Hard stops (immediate)

1. No cohort recruitment of real candidates/recruiters  
2. No real candidate/recruiter activation for pilot  
3. Do not claim pilot readiness sufficient  
4. Do not recommend Gate F PASS  
5. Do not declare PMF  
6. Do not flip Launch GO  

## Allowed

- Engineering productionization waves 0–8 per `docs/FULL_PRODUCT_PRODUCTIONIZATION_PLAN.md`
- Internal/ops use of cohort registry + metrics exclusion
- Waitlist / marketing without promising LIVE pilot access
- Flag-gated experiments that do **not** enroll real pilot users

## Sign-off

| Role | Status |
|------|--------|
| Founder | **DECIDED** (this document) — 2026-07-20 |
| Gate F | Remains **PENDING** until separate Founder sign-off after LIVE bar met |
