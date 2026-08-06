"""Pilot operations, candidate support and feedback readiness (Epic 2.10).

Revision ID: 125_pilot_operations_support_feedback
Revises: 124_evidence_investment_intelligence
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "125_pilot_operations_support_feedback"
down_revision: Union[str, None] = "124_evidence_investment_intelligence"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _std_tail():
    return [
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="FACT"),
        sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
    ]


def upgrade() -> None:
    op.create_table(
        "pilot_runtime_states",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("singleton_key", sa.String(length=32), nullable=False, server_default="global"),
        sa.Column(
            "state",
            sa.String(length=48),
            nullable=False,
            server_default="OPERATIONALLY_READY_INACTIVE",
        ),
        sa.Column("access_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("generation_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("send_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("redemption_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("telemetry_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("support_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("updated_by_label", sa.String(length=120), nullable=True),
        sa.Column("audit_json", sa.Text(), nullable=False, server_default="{}"),
        *_std_tail(),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("singleton_key", name="uq_pilot_runtime_singleton"),
    )

    op.create_table(
        "pilot_cap_buckets",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("bucket_key", sa.String(length=64), nullable=False),
        sa.Column("absolute_max", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("effective_limit", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("used_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        *_std_tail(),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("bucket_key", name="uq_pilot_cap_bucket"),
    )
    op.create_index("ix_pilot_cap_buckets_bucket_key", "pilot_cap_buckets", ["bucket_key"])

    op.create_table(
        "candidate_support_cases",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            "candidate_id",
            sa.Integer(),
            sa.ForeignKey("candidates.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("case_key", sa.String(length=64), nullable=False),
        sa.Column("kind", sa.String(length=32), nullable=False, server_default="problem"),
        # problem|feedback|help
        sa.Column("category", sa.String(length=64), nullable=False, server_default="general"),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="DRAFT"),
        # DRAFT|SUBMITTED|TRIAGED|IN_PROGRESS|WAITING_CANDIDATE|RESOLVED|CLOSED|WITHDRAWN|DELETED
        sa.Column("subject", sa.String(length=200), nullable=False, server_default=""),
        sa.Column("body_text", sa.Text(), nullable=True),
        sa.Column("severity_opt_in", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("diagnostic_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("recovery_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("operator_note", sa.String(length=500), nullable=True),
        sa.Column("closed_reason", sa.String(length=120), nullable=True),
        sa.Column("withdrawn_at", sa.DateTime(), nullable=True),
        sa.Column("resolved_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        *_std_tail(),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "case_key", name="uq_support_case_key"),
    )
    op.create_index("ix_support_cases_candidate_id", "candidate_support_cases", ["candidate_id"])
    op.create_index("ix_support_cases_status", "candidate_support_cases", ["status"])

    op.create_table(
        "candidate_pilot_feedback",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            "candidate_id",
            sa.Integer(),
            sa.ForeignKey("candidates.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("feedback_key", sa.String(length=64), nullable=False),
        sa.Column("category", sa.String(length=64), nullable=False, server_default="ux"),
        sa.Column("rating", sa.Integer(), nullable=True),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("page_path", sa.String(length=300), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="SUBMITTED"),
        # SUBMITTED|WITHDRAWN|DELETED
        sa.Column("used_for_ranking", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("used_for_training", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("withdrawn_at", sa.DateTime(), nullable=True),
        *_std_tail(),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "feedback_key", name="uq_pilot_feedback_key"),
    )
    op.create_index("ix_pilot_feedback_candidate_id", "candidate_pilot_feedback", ["candidate_id"])

    op.create_table(
        "pilot_incident_exercises",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("exercise_key", sa.String(length=80), nullable=False),
        sa.Column("kind", sa.String(length=48), nullable=False, server_default="synthetic_rollback"),
        sa.Column("result", sa.String(length=32), nullable=False, server_default="PASS"),
        sa.Column("detail_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("mutates_state", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        *_std_tail(),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("exercise_key", name="uq_pilot_incident_exercise"),
    )


def downgrade() -> None:
    op.drop_table("pilot_incident_exercises")
    op.drop_table("candidate_pilot_feedback")
    op.drop_index("ix_support_cases_status", table_name="candidate_support_cases")
    op.drop_index("ix_support_cases_candidate_id", table_name="candidate_support_cases")
    op.drop_table("candidate_support_cases")
    op.drop_index("ix_pilot_cap_buckets_bucket_key", table_name="pilot_cap_buckets")
    op.drop_table("pilot_cap_buckets")
    op.drop_table("pilot_runtime_states")
