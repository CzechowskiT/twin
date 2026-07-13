"""Repair alembic_version before upgrade when prod ran pre-#97 revision IDs.

PR #97 inserted 052_calendar_access_token_cache and renumbered audit/pipeline/scheduling.
PR #101 renamed version stamps without applying the calendar migration — prod deploys fail.
"""

from __future__ import annotations

import os
import sys

import sqlalchemy as sa
from sqlalchemy import text

KNOWN_REVISIONS = frozenset(
    {
        "050_stripe_webhook_events",
        "051_company_role_fields",
        "052_calendar_access_token_cache",
        "053_recruiter_audit_events",
        "054_recruiter_pipeline_status",
        "055_recruiter_manual_scheduling",
        "056_recruiter_application_scorecards",
        "057_candidate_evidence_items",
    }
)

OLD_RENAME_WHEN_CALENDAR_READY = {
    "052_recruiter_audit_events": "053_recruiter_audit_events",
    "053_recruiter_pipeline_status": "054_recruiter_pipeline_status",
    "054_recruiter_manual_scheduling": "055_recruiter_manual_scheduling",
}

ORPHAN_REVISIONS = frozenset({"051_recruiter_audit_events"})

# Post-#97 linear chain — never stamp these back to 051 (would re-run 051→077 every deploy).
CURRENT_CHAIN_PREFIXES = ("058_", "059_", "060_", "061_", "062_", "063_", "064_", "065_", "066_", "067_", "068_", "069_", "070_", "071_", "072_", "073_", "074_", "075_", "076_", "077_")

STAMP_BACK_TARGET = "051_company_role_fields"
CALENDAR_COLUMN = "access_token_encrypted"
CALENDAR_TABLES = ("user_google_calendar", "user_microsoft_calendar")


def calendar_cache_columns_present(conn: sa.Connection) -> bool:
    """True when PR #97 calendar token cache columns exist on both provider tables."""
    for table in CALENDAR_TABLES:
        row = conn.execute(
            text(
                """
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = :table
                  AND column_name = :column
                LIMIT 1
                """
            ),
            {"table": table, "column": CALENDAR_COLUMN},
        ).fetchone()
        if row is None:
            return False
    return True


def _stamp(conn: sa.Connection, new_rev: str, old_rev: str) -> None:
    conn.execute(
        text("UPDATE alembic_version SET version_num = :new WHERE version_num = :old"),
        {"new": new_rev, "old": old_rev},
    )
    conn.commit()
    print(f"Stamped alembic_version: {old_rev} -> {new_rev}")


def recover_alembic_version(database_url: str) -> None:
    """Align alembic_version with the linear 050→056 chain before `alembic upgrade head`."""
    engine = sa.create_engine(database_url)
    with engine.connect() as conn:
        row = conn.execute(text("SELECT version_num FROM alembic_version")).fetchone()
        if not row:
            return

        current = row[0]
        if current in ORPHAN_REVISIONS:
            _stamp(conn, STAMP_BACK_TARGET, current)
            return

        if current not in KNOWN_REVISIONS:
            # 058–077 release train: trust alembic_version; idempotent migrations handle re-run.
            if any(current.startswith(p) for p in CURRENT_CHAIN_PREFIXES):
                return
            if current != "050_stripe_webhook_events":
                _stamp(conn, STAMP_BACK_TARGET, current)
            return

        calendar_ready = calendar_cache_columns_present(conn)
        if not calendar_ready and current not in ("050_stripe_webhook_events", STAMP_BACK_TARGET):
            _stamp(conn, STAMP_BACK_TARGET, current)
            return

        if calendar_ready and current in OLD_RENAME_WHEN_CALENDAR_READY:
            _stamp(conn, OLD_RENAME_WHEN_CALENDAR_READY[current], current)


def _normalize_database_url(url: str) -> str:
    """Railway often provides postgres:// — SQLAlchemy needs psycopg driver."""
    if url.startswith("postgres://"):
        return "postgresql+psycopg://" + url[len("postgres://") :]
    if url.startswith("postgresql://") and "+psycopg" not in url:
        return "postgresql+psycopg://" + url[len("postgresql://") :]
    return url


def main() -> int:
    url = _normalize_database_url(os.environ.get("DATABASE_URL", "").strip())
    if not url:
        return 0
    try:
        recover_alembic_version(url)
    except Exception as exc:
        print(f"Warning: alembic prod recovery skipped: {exc}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
