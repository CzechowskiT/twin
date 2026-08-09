"""Epic 2.15 — candidate data trust / reconciliation / change control.

Revision ID: 131_candidate_data_trust
Revises: 130_real_canary_candidate_designation

Does not touch canary/invite/enrollment/designation tables.
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "131_candidate_data_trust"
down_revision: Union[str, None] = "130_real_canary_candidate_designation"
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
    if not _has_table("candidate_data_trust_reviews"):
        op.create_table(
            "candidate_data_trust_reviews",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column(
                "candidate_id",
                sa.Integer(),
                sa.ForeignKey("candidates.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("review_key", sa.String(length=64), nullable=False),
            sa.Column("trigger_kind", sa.String(length=32), nullable=False, server_default="import_commit"),
            sa.Column("import_batch_key", sa.String(length=64), nullable=True),
            sa.Column("status", sa.String(length=32), nullable=False, server_default="OPEN"),
            sa.Column("schema_version", sa.String(length=48), nullable=False, server_default="twin.candidate_data_trust/v1"),
            sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("commit_snapshot_json", sa.Text(), nullable=False, server_default="{}"),
            sa.Column("coverage_json", sa.Text(), nullable=False, server_default="{}"),
            sa.Column("impact_preview_json", sa.Text(), nullable=False, server_default="{}"),
            sa.Column("impact_preview_version", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("lifecycle_approval_id", sa.Integer(), nullable=True),
            sa.Column("change_set_id", sa.Integer(), nullable=True),
            sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="FACT"),
            sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("first_value_satisfied", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("updated_at", sa.DateTime(), nullable=True),
            sa.Column("deleted_at", sa.DateTime(), nullable=True),
            sa.UniqueConstraint("candidate_id", "review_key", name="uq_data_trust_review_key"),
        )
        op.create_index("ix_data_trust_review_candidate", "candidate_data_trust_reviews", ["candidate_id"])
        op.create_index("ix_data_trust_review_status", "candidate_data_trust_reviews", ["status"])

    if not _has_table("candidate_data_trust_questions"):
        op.create_table(
            "candidate_data_trust_questions",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column(
                "candidate_id",
                sa.Integer(),
                sa.ForeignKey("candidates.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column(
                "review_id",
                sa.Integer(),
                sa.ForeignKey("candidate_data_trust_reviews.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("question_key", sa.String(length=64), nullable=False),
            sa.Column("rule_family", sa.String(length=64), nullable=False),
            sa.Column("domain", sa.String(length=32), nullable=False),
            sa.Column("status", sa.String(length=32), nullable=False, server_default="OPEN"),
            sa.Column("comparison_json", sa.Text(), nullable=False, server_default="{}"),
            sa.Column("resolution_action", sa.String(length=32), nullable=True),
            sa.Column("resolution_json", sa.Text(), nullable=False, server_default="{}"),
            sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="FACT"),
            sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("resolved_at", sa.DateTime(), nullable=True),
            sa.Column("deleted_at", sa.DateTime(), nullable=True),
            sa.UniqueConstraint("candidate_id", "question_key", name="uq_data_trust_question_key"),
        )
        op.create_index("ix_data_trust_q_review", "candidate_data_trust_questions", ["review_id"])
        op.create_index("ix_data_trust_q_status", "candidate_data_trust_questions", ["status"])

    if not _has_table("candidate_data_trust_change_sets"):
        op.create_table(
            "candidate_data_trust_change_sets",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column(
                "candidate_id",
                sa.Integer(),
                sa.ForeignKey("candidates.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column(
                "review_id",
                sa.Integer(),
                sa.ForeignKey("candidate_data_trust_reviews.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("change_set_key", sa.String(length=64), nullable=False),
            sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
            sa.Column("bound_review_version", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("bound_preview_version", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("before_json", sa.Text(), nullable=False, server_default="{}"),
            sa.Column("after_json", sa.Text(), nullable=False, server_default="{}"),
            sa.Column("impact_preview_json", sa.Text(), nullable=False, server_default="{}"),
            sa.Column("execution_json", sa.Text(), nullable=False, server_default="{}"),
            sa.Column("stale_applied_json", sa.Text(), nullable=False, server_default="[]"),
            sa.Column("lifecycle_approval_id", sa.Integer(), nullable=True),
            sa.Column("execution_idempotency_key", sa.String(length=160), nullable=True),
            sa.Column("reverted_from_id", sa.Integer(), nullable=True),
            sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="FACT"),
            sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("resolved_at", sa.DateTime(), nullable=True),
            sa.Column("deleted_at", sa.DateTime(), nullable=True),
            sa.UniqueConstraint("candidate_id", "change_set_key", name="uq_data_trust_cs_key"),
        )
        op.create_index("ix_data_trust_cs_candidate", "candidate_data_trust_change_sets", ["candidate_id"])
        op.create_index("ix_data_trust_cs_status", "candidate_data_trust_change_sets", ["status"])

    if not _has_table("candidate_data_trust_audits"):
        op.create_table(
            "candidate_data_trust_audits",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column(
                "candidate_id",
                sa.Integer(),
                sa.ForeignKey("candidates.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("entity_type", sa.String(length=32), nullable=False),
            sa.Column("entity_id", sa.Integer(), nullable=True),
            sa.Column("action", sa.String(length=64), nullable=False),
            sa.Column("payload_json", sa.Text(), nullable=False, server_default="{}"),
            sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="FACT"),
            sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("created_at", sa.DateTime(), nullable=True),
        )
        op.create_index("ix_data_trust_audit_candidate", "candidate_data_trust_audits", ["candidate_id"])


def downgrade() -> None:
    for name in (
        "candidate_data_trust_audits",
        "candidate_data_trust_change_sets",
        "candidate_data_trust_questions",
        "candidate_data_trust_reviews",
    ):
        if _has_table(name):
            op.drop_table(name)
