# Personalized Pre-Apply Feedback — 2026-05-28

## Purpose

Provide candidate-facing, evidence-aware guidance before application action so users can decide whether to apply, improve profile quality, or reposition role targeting.

This layer is advisory only in MVP scope (no live auto-apply execution).

## Feedback output contract

For each ranked role, generate a deterministic feedback payload with:

- `high_fit_reasons`
- `risk_reasons`
- `missing_requirements`
- `profile_improvements`
- `career_repositioning_suggestion`
- `why_not_apply`
- `role_resilience_note`
- `evidence_backed_skill_note`
- `ranking_explanation`

## Required content blocks

### 1) Why this role is high fit

- Highlight overlap in title, skills, location, salary range, and feedback signals.
- Prefer concrete, short reasons over generic encouragement.

### 2) Why this role is risky

- Show mismatch or uncertainty dimensions (requirements gap, stale profile, location mismatch, insufficient evidence).
- Include confidence-sensitive warnings when evidence is weak.

### 3) Missing requirements

- List explicit gaps against role requirements.
- Separate hard requirements from optional nice-to-have items.

### 4) Profile improvements

- Offer actionable updates candidate can do before applying:
  - CV update
  - project/case study link
  - skill evidence attachment
  - language/assessment proof

### 5) Career repositioning suggestion

- When fit is partial, suggest nearby role families likely to yield higher acceptance probability.
- Keep suggestions bounded to existing candidate profile and evidence.

### 6) Why not apply

- Include a clear "do not apply now" rationale when risk exceeds fit.
- Must remain informational and non-judgmental.

### 7) Role resilience note

- Explain role durability signal (market demand/frequency/freshness proxy) when available.
- If resilience signal is unavailable, return explicit "insufficient data" note.

### 8) Evidence-backed skill note

- Distinguish between declared and evidence-backed skills in explanations.
- Never claim formal verification for unsupported skills.

### 9) Ranking explanation

- Explain contribution drivers for final score in human language:
  - baseline fit
  - source quality/freshness/completeness
  - feedback adjustments (`apply_intent`, `relevant`, `not_now`, `not_relevant` exclusion)
- Keep explanation deterministic and audit-friendly.

## Safety and privacy constraints

- No secrets/credential values in payloads or logs.
- No hidden scoring internals requiring confidential data disclosure.
- No fabricated claims (skills, certifications, verification status).
- No autonomous apply side effects from feedback generation.

## Candidate messaging guardrails

- Use "possible fit" and "fits because" style messaging for uncertain/high-confidence states.
- Avoid absolute guarantees ("you will get interview", "verified expert") unless evidence and policy allow.
- Keep "why not apply" available to reduce noise and improve acceptance-quality pipeline.

## Current implementation alignment (2026-05-28)

- Existing `match_reason` already provides concise ranking rationale tied to profile overlap.
- Existing ranking and match-feedback signals support safe explanation expansion without risky automation.
- This spec defines structured extension points for pre-apply guidance while preserving strict safety constraints.
