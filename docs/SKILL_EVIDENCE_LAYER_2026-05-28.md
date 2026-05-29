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

### Evidence metadata shape (minimal, schema-level)

Required metadata fields for each skill-evidence row:

- `skill_name`
- `declared_by_candidate`
- `evidence_type`
- `evidence_source`
- `evidence_visibility`
- `evidence_confidence`
- `evidence_status`
- `last_seen_at` / `observed_at`
- `privacy_class`
- `allowed_usage`

`allowed_usage` should explicitly gate where evidence can be used, e.g. `ranking_only`, `candidate_feedback`, `recruiter_summary`, `internal_audit`.

### Provenance contract (HB-E007)

Each `evidence_sources[]` entry should carry immutable provenance fields:

- `source_id`: stable identifier for evidence artifact.
- `source_type`: one of `cv | project | certificate | github | case_study | language_test | assessment`.
- `captured_at`: UTC timestamp when evidence was ingested.
- `origin`: `candidate_upload | parser_extraction | reviewer_attachment`.
- `content_hash`: optional checksum for tamper detection.
- `consent_scope`: reference to consent basis used for processing.
- `retention_class`: data-retention policy selector.
- `status`: `active | superseded | withdrawn`.

Provenance records must be append-only. Updates create new versions; they do not rewrite prior evidence facts.

### Acceptance signals contract (HB-E008)

Skill evidence should expose acceptance-oriented signals for ranking and explanation layers:

- `acceptance_signal`: `supports_role | partial_support | weak_support | no_support`.
- `acceptance_strength`: numeric `0.0-1.0`.
- `acceptance_reasons`: short machine-readable reason codes.
- `blocking_gaps`: explicit missing requirements tied to role expectation.
- `evidence_conflicts`: contradictory evidence flags requiring downgrade/review.

## Confidence and recency rules

- Confidence increases with multiple independent evidence sources.
- Confidence decays over time for fast-changing skills.
- Older artifacts remain usable for context but receive reduced ranking weight.
- Recency weighting should be explicit, deterministic, and testable.

### Confidence rubric (HB-E009)

- `high` (`>=0.8`): at least two independent active sources, recent evidence, no conflicts.
- `medium` (`0.5-0.79`): one strong source or two weaker sources, limited conflict.
- `low` (`<0.5`): declaration-only or stale/contradictory evidence.
- Unsupported skills default to `low` and cannot be labeled verified.

## Privacy classes

- `candidate_private`: visible only to candidate and internal systems.
- `recruiter_visible`: safe to expose in recruiter-facing contexts.
- `compliance_restricted`: high-sensitivity data requiring stricter access controls.

Default should be least-privilege (`candidate_private`) until explicit promotion criteria are met.

### Privacy enforcement contract (HB-E010)

- `candidate_private` never appears in recruiter-facing APIs.
- `recruiter_visible` must exclude raw document payloads and sensitive identifiers.
- `compliance_restricted` requires explicit policy gate and purpose-limited access.
- Ranking/explanation layers may consume aggregated signals, not raw sensitive evidence blobs.

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
- This model is not full KYC and not employer-certified verification.
- "Evidence-backed" means supported by candidate-provided or candidate-declared artifacts; it is not legal/identity certification.
- Terms like "verified", "KYC-approved", or "employer-validated" are forbidden unless a future dedicated verification provider/review workflow is implemented.

## Current codebase alignment (2026-05-28)

- Existing matching feedback and ranking logic already distinguishes deterministic feedback signals (`apply_intent`, `relevant`, `not_relevant`, `not_now`) and applies safe score adjustments.
- Existing match reason generation is profile-overlap based and avoids verification wording by default.
- This document defines the product contract for extending skill evidence safely without introducing risky autonomous behavior.
