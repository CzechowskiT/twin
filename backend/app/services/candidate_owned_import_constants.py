"""Epic 2.12 — Constants for candidate-owned import (content-free)."""

from __future__ import annotations

SCHEMA = "twin.candidate_owned_import/v1"
CONTRACT_ID = "candidate_owned_import_v1"

STATES = (
    "DRAFT",
    "UPLOADED",
    "QUARANTINED",
    "VALIDATING",
    "REJECTED",
    "PARSING",
    "STAGED",
    "PREVIEW_READY",
    "AWAITING_APPROVAL",
    "COMMITTING",
    "COMMITTED",
    "ROLLING_BACK",
    "ROLLED_BACK",
    "CANCELLED",
    "FAILED",
    "DELETED",
)

FAMILIES = ("document", "tracker", "twin_export", "linkedin_export")

# Fail-closed: no generic ZIP/XLSX without equal security pipeline
ALLOWED_EXT = {
    "document": frozenset({".pdf", ".docx", ".txt", ".md"}),
    "tracker": frozenset({".csv", ".json"}),
    "twin_export": frozenset({".json"}),
    "linkedin_export": frozenset({".json", ".csv"}),
}

MAX_UPLOAD_BYTES = 2_000_000
MAX_EXTRACT_CHARS = 50_000
MAX_STAGING_ITEMS = 200
MAX_CSV_ROWS = 200
PARSE_TIMEOUT_SEC = 8

TRUTH = "CANDIDATE_DECLARED"
CLAIM_KINDS = frozenset(
    {"CANDIDATE_DECLARED", "UNKNOWN", "INSUFFICIENT_DATA", "CONFLICTING", "STALE"}
)

# Fields denied on TWIN restore
TWIN_RESTORE_DENY_KEYS = frozenset(
    {
        "password",
        "hashed_password",
        "token",
        "access_token",
        "refresh_token",
        "secret",
        "api_key",
        "oauth",
        "roles",
        "role",
        "consent",
        "consents",
        "telemetry",
        "audit",
        "audits",
        "synthetic",
        "is_synthetic",
        "credentials",
        "session",
        "cookie",
        "runtime",
    }
)

AUDIT_EVENTS = frozenset(
    {
        "import_batch_created",
        "import_uploaded",
        "import_quarantined",
        "import_rejected",
        "import_parsed",
        "import_staged",
        "import_previewed",
        "import_approval_recorded",
        "import_committed",
        "import_rolled_back",
        "import_cancelled",
        "import_deleted",
        "import_failed",
    }
)
