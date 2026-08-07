"""Epic 2.13 — Unified Career Workspace Search constants."""

from __future__ import annotations

SCHEMA = "twin.unified_career_workspace_search/v1"
CONTRACT_ID = "unified_career_workspace_search_v1"

# Domain adapters — unknown domains fail closed.
ALLOWED_RECORD_DOMAINS = frozenset(
    {
        "evidence",
        "opportunity_watch",
        "interview_process",
        "transition",
        "import_batch",
    }
)

MATCH_REASONS = frozenset(
    {
        "TITLE_MATCH",
        "SUMMARY_MATCH",
        "LABEL_MATCH",
        "COMPANY_MATCH",
        "CAPABILITY_LABEL_MATCH",
        "CAPABILITY_HREF_MATCH",
        "FAMILY_MATCH",
    }
)

RESULT_GROUP_CAPABILITY = "capability"
RESULT_GROUP_RECORD = "record"

# Evidence statuses excluded from default search (not yet committed durable).
EVIDENCE_EXCLUDED_STATUS = frozenset({"draft", "rejected"})
