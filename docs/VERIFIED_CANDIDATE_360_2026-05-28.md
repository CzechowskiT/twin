# Verified Candidate 360 — 2026-05-28

## Definition

Verified Candidate 360 is TWIN's unified candidate trust profile used for readiness gating, package preparation, and safe delegated workflows.

## Required dimensions

- CV
- Experience
- Skills
- Preferences
- Location
- Salary expectations
- Consents
- Readiness status
- Truthfulness declaration
- Optional language/seniority validation
- Skill evidence
- Delegated apply status
- Application evidence
- Feedback history

## Read model strategy

Current branch supports a partial 360 read model from existing tables:

- `users`: consent and account-level trust context.
- `candidates`: profile, CV metadata, preference and signal JSON.
- `applications`: submission evidence, placement state, recruiter feedback.
- `placement_events`: append-only verification events.
- `auto_apply_consents`: existing consent state (not delegated consent).

## Confidence tiers

- `declared`: candidate-provided, not externally verified.
- `inferred`: model-derived signal from CV/profile.
- `verified`: confirmed by explicit evidence path.
- `blocked`: missing consent, conflicting data, or suspended state.

## MVP constraints

- No claim of full identity/KYC verification in this slice.
- No claim that delegated apply is enabled by default.
- No hidden promotion from `verified_basic` to delegated submit.
