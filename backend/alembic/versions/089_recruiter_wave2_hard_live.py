"""Recruiter Wave 2 — decision memory + Hard LIVE evidence seed support.

ORM: RecruiterDecisionMemoryEntry
Service: app/services/recruiter_wave2.py
API: app/api/recruiter_wave2.py + recruiter decision-memory routes
Plan: docs/FULL_PRODUCT_PRODUCTIONIZATION_PLAN.md Wave 2
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "089_recruiter_wave2_hard_live"
down_revision: Union[str, None] = "088_candidate_wave1_hard_live"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(name: str) -> bool:
    bind = op.get_bind()
    return name in inspect(bind).get_table_names()


def upgrade() -> None:
    if not _has_table("recruiter_decision_memory_entries"):
        op.create_table(
            "recruiter_decision_memory_entries",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("company_slug", sa.String(length=80), nullable=False),
            sa.Column("subject_type", sa.String(length=32), nullable=False),
            sa.Column("subject_id", sa.String(length=64), nullable=False),
            sa.Column("application_id", sa.Integer(), nullable=True),
            sa.Column("decision_code", sa.String(length=64), nullable=False),
            sa.Column("summary", sa.String(length=500), nullable=False),
            sa.Column("rationale_code", sa.String(length=64), nullable=True),
            sa.Column("source", sa.String(length=32), nullable=False, server_default="live"),
            sa.Column("demo_fixture", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("meta_json", sa.Text(), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
            sa.ForeignKeyConstraint(
                ["application_id"],
                ["applications.id"],
                ondelete="SET NULL",
            ),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(
            "ix_rec_decision_memory_company",
            "recruiter_decision_memory_entries",
            ["company_slug"],
        )
        op.create_index(
            "ix_rec_decision_memory_subject",
            "recruiter_decision_memory_entries",
            ["company_slug", "subject_type", "subject_id"],
        )
        op.create_index(
            "ix_rec_decision_memory_application",
            "recruiter_decision_memory_entries",
            ["application_id"],
        )


def downgrade() -> None:
    if _has_table("recruiter_decision_memory_entries"):
        op.drop_index(
            "ix_rec_decision_memory_application",
            table_name="recruiter_decision_memory_entries",
        )
        op.drop_index(
            "ix_rec_decision_memory_subject",
            table_name="recruiter_decision_memory_entries",
        )
        op.drop_index(
            "ix_rec_decision_memory_company",
            table_name="recruiter_decision_memory_entries",
        )
        op.drop_table("recruiter_decision_memory_entries")
