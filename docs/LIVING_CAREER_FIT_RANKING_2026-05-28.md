# Living Career Fit Ranking — 2026-05-28

## Purpose

Define a feedback-aware ranking policy that evolves with candidate intent and evidence quality while remaining deterministic, explainable, and safe.

## Signal semantics

### `not_relevant`

- Strong negative preference signal.
- Excludes marked role from feed and suppresses similar duplicates when dedupe keys align.
- Should lower exposure of near-identical roles across boards.

### `apply_intent`

- Positive intent signal for similar role clusters.
- Increases ranking for role-family neighbors, with bounded effect.

### `not_now`

- Temporary timing signal.
- Applies a decay-based penalty that weakens over time.
- Should not permanently hide potentially good roles.

### `relevant`

- Moderate positive signal for refinement without forcing immediate apply behavior.

## Signal taxonomy (HB-E014)

- `intent_signal`: `apply_intent | relevant | not_now | not_relevant`
- `evidence_signal`: `evidence_high | evidence_medium | evidence_low | evidence_missing`
- `risk_signal`: `hard_gap | soft_gap | stale_profile | low_data_quality`
- `resilience_signal`: `high_resilience | medium_resilience | low_resilience | unknown`
- `policy_signal`: `do_not_apply | compliance_hold | normal`

Each signal type should map to deterministic score deltas or exclusion rules and be explainable in payload output.

## Do-not-apply rules

- Role-level hard suppression can be driven by:
  - explicit user "do not apply" preference,
  - hard mismatch (non-negotiable requirement failure),
  - policy/legal gating.
- Suppressed roles remain auditable but excluded from recommendation surfaces.

## Evidence-aware skill weighting

- Evidence-backed skills receive stronger influence than declared-only skills.
- Declared-only skills remain useful but capped to reduce overclaim risk.
- Unsupported or stale evidence should not escalate to verified messaging or high-confidence boosts.

## Role resilience boost

- Roles with stronger resilience indicators (freshness, quality source, demand persistence) can receive bounded boosts.
- Boost must be transparent in ranking explanations.

## Risky role penalty

- Roles with high uncertainty/risk signals should receive explicit penalties.
- Penalty factors can include:
  - weak evidence fit
  - low data completeness
  - known mismatch patterns
  - low resilience indicators

## Feedback decay policy

- Positive and negative interaction effects should decay over time to avoid permanent lock-in.
- Suggested defaults:
  - `apply_intent`: slow decay
  - `relevant`: moderate decay
  - `not_now`: faster decay
  - `not_relevant`: durable unless candidate explicitly reopens category
- Decay windows should be configurable and covered by tests before production use.

### Decay semantics (HB-E015)

Recommended baseline windows:

- `not_now`: half-life 14 days, then gradual neutralization.
- `apply_intent`: half-life 30 days to preserve near-term intent.
- `relevant`: half-life 21 days.
- `not_relevant`: no automatic expiry; only explicit candidate reversal can reopen.

Safeguards:

- Decay must never flip `do_not_apply` policy signals.
- Decay updates should be idempotent and reproducible for the same reference time.
- Explanation payload should include active decay factors when applied.

## Ranking explanation contract

- Every score-impacting feedback/evidence rule should map to an explanation fragment.
- Explanations must avoid unsupported verification claims.
- Output should remain stable and human-auditable across reruns.

## Current codebase alignment (2026-05-28)

- Existing ranking already applies deterministic feedback adjustments:
  - `apply_intent` (+3)
  - `relevant` (+2)
  - `not_now` (-2)
  - `not_relevant` exclusion + duplicate suppression
- Existing dedupe strategy (`feed_dedupe_key`) supports cross-board sibling suppression after `not_relevant`.
- This document extends the policy direction for evidence-aware and decay-aware evolution without introducing live autonomous apply behavior.
