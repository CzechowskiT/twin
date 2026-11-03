"""Epic 2.26 — adaptive interview practice sessions, turns, evaluations.

Revision ID: 139_candidate_interview_practice
Revises: 138_candidate_totp_mfa

Additive only. No canary DML. No ATS scoring, camera capture, or behavioral-score columns.
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "139_candidate_interview_practice"
down_revision: Union[str, None] = "138_candidate_totp_mfa"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(name: str) -> bool:
    conn = op.get_bind()
    rows = conn.execute(
        sa.text(
            "SELECT 1 FROM information_schema.tables "
            "WHERE table_name = :n LIMIT 1"
        ),
        {"n": name},
    ).fetchall()
    return bool(rows)


def upgrade() -> None:
    if not _has_table("candidate_interview_practice_sessions"):
        op.create_table(
            "candidate_interview_practice_sessions",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column(
                "candidate_id",
                sa.Integer(),
                sa.ForeignKey("candidates.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("session_key", sa.String(length=160), nullable=False),
            sa.Column("process_id", sa.Integer(), nullable=True),
            sa.Column("exercise_id", sa.String(length=64), nullable=True),
            sa.Column("state", sa.String(length=32), nullable=False, server_default="DRAFT"),
            sa.Column("locale", sa.String(length=8), nullable=False, server_default="en"),
            sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("turn_limit", sa.Integer(), nullable=False, server_default="8"),
            sa.Column("consent_ai_at", sa.DateTime(), nullable=True),
            sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("updated_at", sa.DateTime(), nullable=True),
            sa.Column("deleted_at", sa.DateTime(), nullable=True),
            sa.UniqueConstraint("candidate_id", "session_key", name="uq_practice_session_key"),
        )
        op.create_index(
            "ix_practice_sessions_candidate",
            "candidate_interview_practice_sessions",
            ["candidate_id"],
        )

    if not _has_table("candidate_interview_practice_turns"):
        op.create_table(
            "candidate_interview_practice_turns",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column(
                "session_id",
                sa.Integer(),
                sa.ForeignKey("candidate_interview_practice_sessions.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("turn_index", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("state", sa.String(length=32), nullable=False, server_default="DRAFT"),
            sa.Column("question_text", sa.Text(), nullable=False, server_default=""),
            sa.Column("answer_draft", sa.Text(), nullable=False, server_default=""),
            sa.Column("answer_submitted", sa.Text(), nullable=True),
            sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("submitted_at", sa.DateTime(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("updated_at", sa.DateTime(), nullable=True),
        )
        op.create_index(
            "ix_practice_turns_session",
            "candidate_interview_practice_turns",
            ["session_id"],
        )

    if not _has_table("candidate_interview_practice_evaluations"):
        op.create_table(
            "candidate_interview_practice_evaluations",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column(
                "turn_id",
                sa.Integer(),
                sa.ForeignKey("candidate_interview_practice_turns.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column(
                "evaluation_status",
                sa.String(length=64),
                nullable=False,
                server_default="PENDING",
            ),
            sa.Column("criteria_json", sa.Text(), nullable=False, server_default="[]"),
            sa.Column("strengths_json", sa.Text(), nullable=False, server_default="[]"),
            sa.Column("improvements_json", sa.Text(), nullable=False, server_default="[]"),
            sa.Column(
                "source",
                sa.String(length=64),
                nullable=False,
                server_default="DETERMINISTIC_LIBRARY_FALLBACK",
            ),
            sa.Column(
                "source_label",
                sa.String(length=64),
                nullable=False,
                server_default="deterministic_library",
            ),
            sa.Column("degraded", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("created_at", sa.DateTime(), nullable=True),
        )
        op.create_index(
            "ix_practice_evaluations_turn",
            "candidate_interview_practice_evaluations",
            ["turn_id"],
        )


def downgrade() -> None:
    if _has_table("candidate_interview_practice_evaluations"):
        op.drop_table("candidate_interview_practice_evaluations")
    if _has_table("candidate_interview_practice_turns"):
        op.drop_table("candidate_interview_practice_turns")
    if _has_table("candidate_interview_practice_sessions"):
        op.drop_table("candidate_interview_practice_sessions")
