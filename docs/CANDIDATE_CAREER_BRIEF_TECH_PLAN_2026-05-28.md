# Candidate Career Brief — Technical Plan (2026-05-28)

## Scope

Define an incremental implementation path for Career Brief using existing profile signal storage first, then dedicated schema later.

## Existing fields audit (no migration path)

- `candidates.profile_signals_json` already stores structured blobs (`cv_insights`, `career_compass`, `cv_tailoring`).
- `candidates` includes core profile data (`name`, `skills`, `experience_years`, `desired_salary`, `location`).
- `users` and `candidates` contain consent markers usable for baseline gating.

## What can ship without migration

- Read-only readiness gate checks for brief presence in `profile_signals_json` (`career_compass` dict → `career_brief_present` checklist item).
- `GET /api/v1/candidates/me/verified-readiness` exposes `career_brief_missing` when compass blob absent.
- API contract for brief sections in docs and frontend planning.
- Validation logic in service layer using current JSON blob shape.
- No brief edit endpoint required for gateway; profile signals update paths remain separate.

## What requires migration (deferred)

- Dedicated `candidate_career_brief` table with versioned sections.
- Representation-boundary audit event stream.
- Do-not-apply rule normalization table for policy engine.
- Per-section confidence provenance fields.

## Suggested JSON shape (intermediate)

- `career_brief.who_i_am`
- `career_brief.what_i_want`
- `career_brief.what_i_do_not_want`
- `career_brief.ideal_roles`
- `career_brief.risky_roles`
- `career_brief.strengths`
- `career_brief.salary`
- `career_brief.location_remote`
- `career_brief.authorized_representation_boundaries`
- `career_brief.do_not_apply_rules`
- `career_brief.what_twin_may_say`
- `career_brief.what_twin_must_never_say`

## Guardrails

- No automatic external submit from brief creation/update.
- No hidden override of do-not-apply constraints.
- No unverifiable claims injected into package generation.
