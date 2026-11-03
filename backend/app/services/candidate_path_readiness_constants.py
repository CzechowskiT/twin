"""Epic 2.16 — candidate-selected path readiness constants.

Compose-only registry. Does not recommend a best path. No employability scores.
"""

from __future__ import annotations

SCHEMA_ID = "twin.candidate_path_readiness/v1"
CONTRACT_ID = "candidate_path_readiness_v1"
FIRST_VALUE_CONTRACT = "pilot_first_value_v1"

PATH_KINDS = (
    "EVALUATE_ONE_OPPORTUNITY",
    "PREPARE_ONE_APPLICATION",
    "PREPARE_ONE_INTERVIEW",
    "REVIEW_ONE_CAREER_DECISION",
    "MOVE_ONE_APPROVED_DECISION_TO_EXECUTION",
)

# Axis 1 — path state (healthy empty = STARTABLE, never false BLOCKED)
PATH_STATES = frozenset(
    {"STARTABLE", "IN_PROGRESS", "BLOCKED", "COMPLETE", "UNAVAILABLE"}
)

# Axis 2 — requirement status
REQUIREMENT_STATUSES = frozenset(
    {"MISSING", "PRESENT", "STALE", "OPTIONAL", "SATISFIED", "BLOCKING"}
)

# Precedence (highest first) for derived path_state
PATH_STATE_PRECEDENCE = (
    "UNAVAILABLE",
    "BLOCKED",
    "IN_PROGRESS",
    "STARTABLE",
    "COMPLETE",
)

# Allowlisted resolution deep links only (non-mutating navigation)
RESOLUTION_DEEP_LINKS = frozenset(
    {
        "/dashboard/matches",
        "/dashboard/application-studio",
        "/dashboard/interview-decision",
        "/dashboard/interview-practice",
        "/dashboard/approvals",
        "/dashboard/execution-calendar",
        "/dashboard/portfolio",
        "/dashboard/career",
        "/dashboard/data-trust",
        "/dashboard/privacy-center",
        "/dashboard/import",
        "/dashboard/strategy",
        "/dashboard/review-center",
    }
)

BANNED_COPY_PHRASES = frozenset(
    {
        "ready to apply",
        "ready to interview",
        "career-ready",
        "career ready",
        "employability",
        "best path",
        "recommended path",
    }
)

# Hard composition boundaries
OWNS_IMPORT = "epic_2_12"
OWNS_SEARCH = "epic_2_13"
OWNS_DATA_TRUST = "epic_2_15"
OWNS_GFV_DEMO = "epic_2_11"
OWNS_DAILY_OS_EXEC_CAL = "daily_os_execution_calendar"

RECOMMENDS_BEST_PATH = False
PERSON_EMPLOYABILITY_SCORES = False
MUTATES_ON_EVALUATE = False
CLICKS_EQUAL_SATISFACTION = False
FIRST_VALUE_SATISFIED_BY_PATH_READINESS = False
EIGHTH_PRIMARY_NAV = False
AUTO_CONTINUE_AFTER_DATA_TRUST = False
