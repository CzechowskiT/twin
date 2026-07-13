# Hardening track — feature flag audit (2026-07-13)

> **PR scope:** docs + guard only — no runtime flag flips

## Intent

Audit workspace feature flags and ship-status constants so no C3–C5 module claims `LIVE` or `GA` before founder smoke.

## Guard

`frontend/scripts/hardening-feature-flag-audit-guard.test.ts`

## Acceptance

- `RECRUITER_*_SHIP_STATUS` constants remain `PILOT` on stacked branches
- No `STRIPE_LIVE`, `ATS_WRITE`, or `MICROSOFT_CALENDAR_LIVE` flips in wave PRs
- Internal-only flags documented in activation master plan

**Status:** guard on hardening branch; merge after #451 tooling.
