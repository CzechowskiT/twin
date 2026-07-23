"""Investor external attestations HITL queue (founder-signed).

ORM: InvestorExternalAttestation
Service: app/services/investor_wave4.py
API: app/api/investor_wave4.py
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "098_investor_external_attestations"
down_revision: Union[str, None] = "097_founder_completion_ats_calendar_billing"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(name: str) -> bool:
    bind = op.get_bind()
    return name in inspect(bind).get_table_names()


def upgrade() -> None:
    if not _has_table("investor_external_attestations"):
        op.create_table(
            "investor_external_attestations",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("subject_label", sa.String(length=255), nullable=False),
            sa.Column("claim_text", sa.Text(), nullable=False),
            sa.Column(
                "status",
                sa.String(length=32),
                nullable=False,
                server_default="PENDING_FOUNDER_SIGNATURE",
            ),
            sa.Column("evidence_ref", sa.String(length=512), nullable=True),
            sa.Column("signed_by", sa.String(length=255), nullable=True),
            sa.Column("signed_at", sa.DateTime(), nullable=True),
            sa.Column("created_by_user_id", sa.Integer(), nullable=True),
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
            sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(
            "ix_investor_external_attestations_status",
            "investor_external_attestations",
            ["status"],
        )
        op.create_index(
            "ix_investor_external_attestations_created_by",
            "investor_external_attestations",
            ["created_by_user_id"],
        )


def downgrade() -> None:
    if _has_table("investor_external_attestations"):
        op.drop_index(
            "ix_investor_external_attestations_created_by",
            table_name="investor_external_attestations",
        )
        op.drop_index(
            "ix_investor_external_attestations_status",
            table_name="investor_external_attestations",
        )
        op.drop_table("investor_external_attestations")
