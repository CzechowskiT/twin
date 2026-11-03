"""Controlled pilot organizations, invitation packs, support tickets.

ORM: PilotOrganization, PilotInvitationPack, PilotSupportTicket
Service: app/services/controlled_pilot_os.py
API: /api/v1/admin/pilot-os/*
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "100_controlled_pilot_os"
down_revision: Union[str, None] = "099_data_room_document_blobs"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(name: str) -> bool:
    bind = op.get_bind()
    return name in inspect(bind).get_table_names()


def upgrade() -> None:
    if not _has_table("pilot_organizations"):
        op.create_table(
            "pilot_organizations",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("slug", sa.String(length=80), nullable=False),
            sa.Column("display_name", sa.String(length=200), nullable=False),
            sa.Column("market", sa.String(length=64), nullable=False, server_default="PL"),
            sa.Column(
                "approval_status",
                sa.String(length=32),
                nullable=False,
                server_default="CANDIDATE",
            ),
            sa.Column(
                "is_synthetic",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("false"),
            ),
            sa.Column("recipient_emails_json", sa.Text(), nullable=True),
            sa.Column("cohort_id", sa.Integer(), nullable=True),
            sa.Column("tenant_id", sa.Integer(), nullable=True),
            sa.Column("approved_at", sa.DateTime(), nullable=True),
            sa.Column("approved_by_label", sa.String(length=120), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
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
                ["cohort_id"], ["activation_cohorts.id"], ondelete="SET NULL"
            ),
            sa.ForeignKeyConstraint(
                ["tenant_id"], ["organization_tenants.id"], ondelete="SET NULL"
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("slug"),
        )
        op.create_index("ix_pilot_organizations_slug", "pilot_organizations", ["slug"])
        op.create_index(
            "ix_pilot_organizations_approval_status",
            "pilot_organizations",
            ["approval_status"],
        )
        op.create_index(
            "ix_pilot_organizations_is_synthetic",
            "pilot_organizations",
            ["is_synthetic"],
        )

    if not _has_table("pilot_invitation_packs"):
        op.create_table(
            "pilot_invitation_packs",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("organization_id", sa.Integer(), nullable=False),
            sa.Column(
                "status", sa.String(length=32), nullable=False, server_default="DRAFT"
            ),
            sa.Column("recipients_json", sa.Text(), nullable=True),
            sa.Column(
                "template_key",
                sa.String(length=128),
                nullable=False,
                server_default="controlled_pilot_invite_v1",
            ),
            sa.Column("prepared_at", sa.DateTime(), nullable=True),
            sa.Column("sent_at", sa.DateTime(), nullable=True),
            sa.Column("founder_send_approval_ref", sa.String(length=128), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
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
                ["organization_id"],
                ["pilot_organizations.id"],
                ondelete="CASCADE",
            ),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(
            "ix_pilot_invitation_packs_organization_id",
            "pilot_invitation_packs",
            ["organization_id"],
        )
        op.create_index(
            "ix_pilot_invitation_packs_status", "pilot_invitation_packs", ["status"]
        )

    if not _has_table("pilot_support_tickets"):
        op.create_table(
            "pilot_support_tickets",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("organization_id", sa.Integer(), nullable=True),
            sa.Column(
                "category", sa.String(length=64), nullable=False, server_default="general"
            ),
            sa.Column(
                "status", sa.String(length=32), nullable=False, server_default="open"
            ),
            sa.Column("subject", sa.String(length=200), nullable=False),
            sa.Column("body_summary", sa.Text(), nullable=True),
            sa.Column(
                "severity", sa.String(length=16), nullable=False, server_default="normal"
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
            sa.Column("resolved_at", sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(
                ["organization_id"],
                ["pilot_organizations.id"],
                ondelete="SET NULL",
            ),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(
            "ix_pilot_support_tickets_organization_id",
            "pilot_support_tickets",
            ["organization_id"],
        )
        op.create_index(
            "ix_pilot_support_tickets_status", "pilot_support_tickets", ["status"]
        )


def downgrade() -> None:
    for name in (
        "pilot_support_tickets",
        "pilot_invitation_packs",
        "pilot_organizations",
    ):
        if _has_table(name):
            op.drop_table(name)
