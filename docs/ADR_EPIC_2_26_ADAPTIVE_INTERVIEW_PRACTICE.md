"""Epic 2.26 ADR — Candidate-owned adaptive interview practice.

Decision
--------
Extend the existing CandidateInterview* Decision Copilot domain. Do not create a
parallel practice SoR, Journey Continuity store, or first-value authority.

Ownership
---------
- Candidate owns processes, answers, practice sessions, turns, and evaluations.
- Staff/ops cannot read practice transcripts without explicit future entitlement
  (not in scope). Synthetic accounts are kpi_excluded.

Drafts vs submitted turns
-------------------------
- Turns start as DRAFT (mutable, not evaluated as evidence).
- SUBMITTED turns are immutable for evaluation; supersession creates a new turn.
- Optimistic concurrency via session.version / turn.version.

AI lifecycle
------------
- Consent: CandidateInterviewPrivacy.ai_prep_opt_in required before live AI.
- Model calls happen outside DB transactions.
- On provider failure or missing key: EVALUATION_UNAVAILABLE — never invent a
  numeric precision score from word count.
- Criterion outcomes are qualitative enums only (no global skill %).

Privacy
-------
- Transcript retention follows CandidateInterviewPrivacy.
- Soft-delete cascades to sessions/turns; evidence promotion is explicit and
  labeled PRACTICE_WORK_SAMPLE.
- Deletion follows existing candidate account deletion / interview purge paths.

Integrations
------------
- Career Evidence: optional explicit promotion with PRACTICE_WORK_SAMPLE.
- Career Packs: optional artifact when candidate promotes (kind practice_work_sample).
- Path Readiness PREPARE_ONE_INTERVIEW: consumes process prep_gate only.
- Journey Continuity: resume via existing path-readiness / process routes only.
- PRIMARY_IA remains 7; no eighth nav item.

Rollback floor
--------------
Additive Alembic 139. EXPECTED_ALEMBIC_HEAD must track 139 after deploy.
"""
