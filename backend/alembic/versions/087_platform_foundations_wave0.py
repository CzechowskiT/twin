"""Platform foundations Wave 0 — tenancy, RBAC, flags, events, privacy ops, comms outbox.

ORM: app/database/models.py (OrganizationTenant, TenantMembership, RoleDefinition,
PermissionGrant, FeatureFlagState, PlatformDomainEvent, PrivacyOpsCase, CommunicationOutbox)
Service: app/services/platform_foundations.py
API: app/api/platform_foundations.py
Plan: docs/FULL_PRODUCT_PRODUCTIONIZATION_PLAN.md
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "087_platform_foundations_wave0"
down_revision: Union[str, None] = "086_activation_cohorts"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(name: str) -> bool:
    bind = op.get_bind()
    return name in inspect(bind).get_table_names()


def upgrade() -> None:
    if not _has_table("organization_tenants"):
        op.create_table(
            "organization_tenants",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("slug", sa.String(length=80), nullable=False),
            sa.Column("display_name", sa.String(length=200), nullable=False),
            sa.Column("tenant_type", sa.String(length=32), nullable=False, server_default="company"),
            sa.Column("status", sa.String(length=32), nullable=False, server_default="active"),
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
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("slug", name="uq_organization_tenants_slug"),
        )
        op.create_index("ix_organization_tenants_tenant_type", "organization_tenants", ["tenant_type"])
        op.create_index("ix_organization_tenants_status", "organization_tenants", ["status"])

    if not _has_table("role_definitions"):
        op.create_table(
            "role_definitions",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("key", sa.String(length=64), nullable=False),
            sa.Column("persona", sa.String(length=32), nullable=False),
            sa.Column("label", sa.String(length=120), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("is_system", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column(
                "created_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("key", name="uq_role_definitions_key"),
        )
        op.create_index("ix_role_definitions_persona", "role_definitions", ["persona"])

    if not _has_table("tenant_memberships"):
        op.create_table(
            "tenant_memberships",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("tenant_id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("role_key", sa.String(length=64), nullable=False),
            sa.Column("status", sa.String(length=32), nullable=False, server_default="active"),
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
            sa.ForeignKeyConstraint(["tenant_id"], ["organization_tenants.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("tenant_id", "user_id", "role_key", name="uq_tenant_membership"),
        )
        op.create_index("ix_tenant_memberships_user_id", "tenant_memberships", ["user_id"])
        op.create_index("ix_tenant_memberships_role_key", "tenant_memberships", ["role_key"])

    if not _has_table("permission_grants"):
        op.create_table(
            "permission_grants",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("role_key", sa.String(length=64), nullable=False),
            sa.Column("permission_key", sa.String(length=128), nullable=False),
            sa.Column("effect", sa.String(length=16), nullable=False, server_default="allow"),
            sa.Column(
                "created_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("role_key", "permission_key", name="uq_permission_grant"),
        )
        op.create_index("ix_permission_grants_role_key", "permission_grants", ["role_key"])

    if not _has_table("feature_flag_states"):
        op.create_table(
            "feature_flag_states",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("flag_key", sa.String(length=128), nullable=False),
            sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("scope", sa.String(length=32), nullable=False, server_default="global"),
            sa.Column("tenant_id", sa.Integer(), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column(
                "updated_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
            sa.ForeignKeyConstraint(["tenant_id"], ["organization_tenants.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("flag_key", "scope", "tenant_id", name="uq_feature_flag_state"),
        )
        op.create_index("ix_feature_flag_states_flag_key", "feature_flag_states", ["flag_key"])

    if not _has_table("platform_domain_events"):
        op.create_table(
            "platform_domain_events",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("event_name", sa.String(length=128), nullable=False),
            sa.Column("aggregate_type", sa.String(length=64), nullable=False),
            sa.Column("aggregate_id", sa.String(length=128), nullable=False),
            sa.Column("actor_user_id", sa.Integer(), nullable=True),
            sa.Column("tenant_id", sa.Integer(), nullable=True),
            sa.Column("payload_json", sa.Text(), nullable=True),
            sa.Column("source", sa.String(length=32), nullable=False, server_default="twin_internal"),
            sa.Column(
                "created_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
            sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["tenant_id"], ["organization_tenants.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_platform_domain_events_event_name", "platform_domain_events", ["event_name"])
        op.create_index(
            "ix_platform_domain_events_aggregate",
            "platform_domain_events",
            ["aggregate_type", "aggregate_id"],
        )
        op.create_index("ix_platform_domain_events_created_at", "platform_domain_events", ["created_at"])

    if not _has_table("privacy_ops_cases"):
        op.create_table(
            "privacy_ops_cases",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("case_type", sa.String(length=32), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("status", sa.String(length=32), nullable=False, server_default="open"),
            sa.Column("legal_basis_note", sa.String(length=255), nullable=True),
            sa.Column("payload_json", sa.Text(), nullable=True),
            sa.Column("source", sa.String(length=32), nullable=False, server_default="twin_internal"),
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
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_privacy_ops_cases_user_id", "privacy_ops_cases", ["user_id"])
        op.create_index("ix_privacy_ops_cases_case_type", "privacy_ops_cases", ["case_type"])
        op.create_index("ix_privacy_ops_cases_status", "privacy_ops_cases", ["status"])

    if not _has_table("communication_outbox"):
        op.create_table(
            "communication_outbox",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("channel", sa.String(length=32), nullable=False, server_default="email"),
            sa.Column("template_key", sa.String(length=128), nullable=False),
            sa.Column("recipient_user_id", sa.Integer(), nullable=True),
            sa.Column("recipient_email_hash", sa.String(length=64), nullable=True),
            sa.Column("status", sa.String(length=32), nullable=False, server_default="draft"),
            sa.Column("payload_json", sa.Text(), nullable=True),
            sa.Column("dedupe_key", sa.String(length=128), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
            sa.Column("sent_at", sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(["recipient_user_id"], ["users.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("dedupe_key", name="uq_communication_outbox_dedupe"),
        )
        op.create_index("ix_communication_outbox_status", "communication_outbox", ["status"])
        op.create_index("ix_communication_outbox_template_key", "communication_outbox", ["template_key"])


def downgrade() -> None:
    for table in (
        "communication_outbox",
        "privacy_ops_cases",
        "platform_domain_events",
        "feature_flag_states",
        "permission_grants",
        "tenant_memberships",
        "role_definitions",
        "organization_tenants",
    ):
        if _has_table(table):
            op.drop_table(table)
