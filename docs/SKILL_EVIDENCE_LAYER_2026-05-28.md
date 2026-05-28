# Skill Evidence Layer — 2026-05-28

## Purpose

Define a safe, auditable skill evidence model that improves ranking quality without making unsupported verification claims.

## Core entities

### 1) Declared skill

- Candidate-provided skill from profile fields (`skills`, role titles, free-text context).
- Treated as a self-declaration signal, not proof.
- Default confidence is low to medium unless corroborated by evidence sources.

### 2) Evidence-backed skill

- Skill claim linked to at least one concrete evidence artifact.
- Must include provenance metadata (source type, capture timestamp, and confidence rationale).
- Never represented as "verified" without explicit evidence record.

### 3) Evidence source

Supported source classes for pilot scope:

- CV/resume extraction (`cv_text`, `cv_insights` artifacts).
- Candidate-uploaded project or portfolio document.
- Certificate (uploaded file metadata + parsing output).
- GitHub evidence (repository metadata or user-provided artifact snapshot).
- Case study or work sample.
- Language test result.
- Structured assessment result.

## Evidence record schema (product-level contract)

Each evidence-backed skill record should include:

- `skill_name`: normalized canonical skill label.
- `declared_by_candidate`: boolean.
- `evidence_sources`: array of source references.
- `confidence`: numeric 0.0-1.0 and optional bucket (`low|medium|high`).
- `recency_days`: age of freshest supporting evidence.
- `privacy_class`: `candidate_private | recruiter_visible | compliance_restricted`.
- `ranking_effect`: additive/attenuated contribution metadata.
- `review_status`: `auto_detected | candidate_confirmed | reviewer_confirmed | rejected`.
- `verification_label`: constrained label that must stay non-verified unless backed.

## Confidence and recency rules

- Confidence increases with multiple independent evidence sources.
- Confidence decays over time for fast-changing skills.
- Older artifacts remain usable for context but receive reduced ranking weight.
- Recency weighting should be explicit, deterministic, and testable.

## Privacy classes

- `candidate_private`: visible only to candidate and internal systems.
- `recruiter_visible`: safe to expose in recruiter-facing contexts.
- `compliance_restricted`: high-sensitivity data requiring stricter access controls.

Default should be least-privilege (`candidate_private`) until explicit promotion criteria are met.

## Ranking effect policy

- Evidence-backed skills receive higher ranking influence than declared-only skills.
- Declared-only skills may still contribute but with capped impact.
- Rejected/unsupported evidence must not increase ranking.
- Ranking explanation text must avoid words implying formal verification unless evidence requirements are met.

## Candidate editing rules

- Candidate can add/remove declared skills.
- Candidate can attach evidence artifacts and edit source metadata.
- Candidate cannot mark a skill as verified directly.
- Candidate edits should create audit events (who, what, when).

## Review rules

- Automated pipeline may suggest evidence-backed status with confidence.
- Human review (if enabled) can approve/reject/promote visibility class.
- Review decisions must be reversible and auditable.
- Rejection must preserve history and prevent accidental verification claims.

## Hard safety rule

Do not claim verification without evidence.

- Any UI/API wording that implies "verified skill" must be gated by evidence presence and review state.
- Unsupported skills remain declared-only and must not be promoted in explanations as verified.

## Current codebase alignment (2026-05-28)

- Existing matching feedback and ranking logic already distinguishes deterministic feedback signals (`apply_intent`, `relevant`, `not_relevant`, `not_now`) and applies safe score adjustments.
- Existing match reason generation is profile-overlap based and avoids verification wording by default.
- This document defines the product contract for extending skill evidence safely without introducing risky autonomous behavior.
