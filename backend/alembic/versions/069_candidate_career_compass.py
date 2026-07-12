"""Candidate career compass persistence (Wave B slice 1)."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "069_candidate_career_compass"
down_revision: Union[str, None] = "068_placement_events_foundation"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    table_exists = conn.execute(
        sa.text(
            "SELECT 1 FROM information_schema.tables "
            "WHERE table_schema = 'public' AND table_name = 'candidate_career_compass' "
            "LIMIT 1"
        )
    ).fetchone()
    if table_exists:
        return
    op.create_table(
        "candidate_career_compass",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), nullable=False),
        sa.Column("target_role", sa.String(length=200), nullable=True),
        sa.Column("target_seniority", sa.String(length=40), nullable=True),
        sa.Column(
            "preferred_industries",
            sa.Text(),
            nullable=False,
            server_default="[]",
        ),
        sa.Column(
            "preferred_locations",
            sa.Text(),
            nullable=False,
            server_default="[]",
        ),
        sa.Column("work_mode", sa.String(length=32), nullable=True),
        sa.Column("salary_expectation_min", sa.Integer(), nullable=True),
        sa.Column("salary_expectation_max", sa.Integer(), nullable=True),
        sa.Column(
            "salary_currency",
            sa.String(length=8),
            nullable=False,
            server_default="PLN",
        ),
        sa.Column(
            "career_priorities",
            sa.Text(),
            nullable=False,
            server_default="[]",
        ),
        sa.Column(
            "skill_gaps",
            sa.Text(),
            nullable=False,
            server_default="[]",
        ),
        sa.Column(
            "strengths",
            sa.Text(),
            nullable=False,
            server_default="[]",
        ),
        sa.Column(
            "next_steps",
            sa.Text(),
            nullable=False,
            server_default="[]",
        ),
        sa.Column(
            "learning_actions",
            sa.Text(),
            nullable=False,
            server_default="[]",
        ),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "completion_status",
            sa.String(length=20),
            nullable=False,
            server_default="draft",
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
        sa.UniqueConstraint("candidate_id", name="uq_candidate_career_compass_candidate_id"),
    )
    op.create_index(
        "ix_candidate_career_compass_candidate_id",
        "candidate_career_compass",
        ["candidate_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_candidate_career_compass_candidate_id", table_name="candidate_career_compass")
    op.drop_table("candidate_career_compass")
