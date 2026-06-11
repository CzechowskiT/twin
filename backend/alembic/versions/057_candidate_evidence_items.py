"""Candidate skill evidence vault items."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "057_candidate_evidence_items"
down_revision: Union[str, None] = "056_recruiter_application_scorecards"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "candidate_evidence_items",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), nullable=False),
        sa.Column("skill_name", sa.String(length=120), nullable=False),
        sa.Column("evidence_type", sa.String(length=40), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("source_url", sa.String(length=2000), nullable=True),
        sa.Column(
            "privacy_class",
            sa.String(length=40),
            nullable=False,
            server_default="candidate_private",
        ),
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
        sa.ForeignKeyConstraint(["candidate_id"], ["candidates.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_candidate_evidence_items_candidate_id",
        "candidate_evidence_items",
        ["candidate_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_candidate_evidence_items_candidate_id", table_name="candidate_evidence_items")
    op.drop_table("candidate_evidence_items")
