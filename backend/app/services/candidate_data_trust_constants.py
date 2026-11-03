"""Epic 2.15 — Candidate Data Trust constants (deterministic, no LLM/fuzzy)."""

from __future__ import annotations

SCHEMA_ID = "twin.candidate_data_trust/v1"
CONTRACT_ID = "candidate_data_trust_v1"
APPROVAL_KIND = "data_trust_change_set"

# Coverage domains included in reconciliation matrix
COVERAGE_INCLUDED = frozenset(
    {
        "profile",
        "direction",
        "roles",
        "skills",
        "evidence",
        "opportunities",
        "lifecycle",
        "provenance",
        "deps",
    }
)

# Explicitly excluded record classes (never question targets)
COVERAGE_EXCLUDED = frozenset(
    {
        "staging",
        "raw_ms",
        "employer",
        "enrichment",
        "canary_control",
        "invite",
        "designation",
        "activation_manifest",
    }
)

RULE_FAMILIES = frozenset(
    {
        "PROFILE_FIELD_CONFLICT",
        "DIRECTION_CONFLICT",
        "ROLE_CONFLICT",
        "SKILL_CONFLICT",
        "EVIDENCE_DUPLICATE_OR_CONFLICT",
        "OPPORTUNITY_NOTE_CONFLICT",
        "LIFECYCLE_PHASE_HINT",
        "PROVENANCE_MISMATCH",
        "DEPENDENT_STALE_RISK",
    }
)

QUESTION_STATES = frozenset(
    {
        "OPEN",
        "COMPARED",
        "RESOLVED_PENDING_PREVIEW",
        "PREVIEWED",
        "PENDING_APPROVAL",
        "APPLIED",
        "DISMISSED",
        "DEFERRED",
        "UNDONE",
        "SUPERSEDED",
        "CONFLICT_BLOCKED",
    }
)

REVIEW_STATES = frozenset(
    {
        "OPEN",
        "IN_REVIEW",
        "PREVIEWED",
        "PENDING_APPROVAL",
        "APPLIED",
        "REJECTED",
        "POSTPONED",
        "UNDONE",
        "CLOSED_NO_QUESTIONS",
    }
)

RESOLUTION_ACTIONS = frozenset(
    {
        "KEEP_EXISTING",
        "REPLACE_WITH_INCOMING",
        "MERGE_DECLARED",
        "DEFER",
        "DISMISS",
    }
)

# Actions that can produce canonical mutations after approval
MUTATING_ACTIONS = frozenset({"REPLACE_WITH_INCOMING", "MERGE_DECLARED"})

# First-value integrity: reconciliation alone never satisfies first value
FIRST_VALUE_SATISFIED_BY_DATA_TRUST = False
AUTO_REPAIR = False
FUZZY_OR_LLM_CONFLICT = False
TRUST_QUALITY_SCORES = False
