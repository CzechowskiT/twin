"""Recruiter talent radar decisions — shortlisted, snoozed, dismissed, audit-only actions.

ORM: app/database/models.py::RecruiterTalentRadarDecision
Service: app/services/recruiter_talent_radar_decisions.py
Design: docs/RECRUITER_TALENT_RADAR_DECISIONS_AUDIT_2026-06-15.md
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "058_recruiter_talent_radar_decisions"
down_revision: Union[str, None] = "057_candidate_evidence_items"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    table_exists = conn.execute(
        sa.text(
            "SELECT 1 FROM information_schema.tables "
            "WHERE table_schema = 'public' AND table_name = 'recruiter_talent_radar_decisions' "
            "LIMIT 1"
        )
    ).fetchone()
    if table_exists:
        return
    op.create_table(
        "recruiter_talent_radar_decisions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("application_id", sa.Integer(), nullable=False),
        sa.Column("company_slug", sa.String(length=80), nullable=False),
        sa.Column("action_type", sa.String(length=64), nullable=False),
        sa.Column("meta_json", sa.Text(), nullable=True),
        sa.Column("snooze_until", sa.DateTime(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.ForeignKeyConstraint(["application_id"], ["applications.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_recruiter_talent_radar_decisions_application_id",
        "recruiter_talent_radar_decisions",
        ["application_id"],
    )
    op.create_index(
        "ix_recruiter_talent_radar_decisions_company_slug",
        "recruiter_talent_radar_decisions",
        ["company_slug"],
    )
    op.create_index(
        "ix_recruiter_talent_radar_decisions_created_at",
        "recruiter_talent_radar_decisions",
        ["created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_recruiter_talent_radar_decisions_created_at", table_name="recruiter_talent_radar_decisions")
    op.drop_index("ix_recruiter_talent_radar_decisions_company_slug", table_name="recruiter_talent_radar_decisions")
    op.drop_index("ix_recruiter_talent_radar_decisions_application_id", table_name="recruiter_talent_radar_decisions")
    op.drop_table("recruiter_talent_radar_decisions")
