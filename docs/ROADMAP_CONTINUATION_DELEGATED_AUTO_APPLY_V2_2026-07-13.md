# Roadmap continuation — delegated auto-apply consent v2 (post-stable)

> **Status:** SPEC ONLY · **Implementation:** blocked until Gate F

## Intent

Granular per-job-board consent, rate limits, and audit trail for autonomous apply — aligned with GDPR consent from day 1.

## Preconditions

1. Candidate trust center smoke PASS (#447–#448 chain)  
2. Nightly auto-apply beat enabled only after founder sign-off  
3. Abuse controls from `docs/REFERRAL_ABUSE_CONTROLS_B3_2026-07-13.md` extended to apply volume

## Not in this release train

- No delegated apply without explicit consent UI  
- No LIVE Stripe / billing changes
