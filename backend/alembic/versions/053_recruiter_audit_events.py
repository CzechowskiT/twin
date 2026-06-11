"""Append-only recruiter compliance audit events (accept/decline + client actions).

ORM: app/database/models.py::RecruiterAuditEvent
Service: app/services/recruiter_audit_trail.py
Design: docs/RECRUITER_COMPLIANCE_AUDIT_TRAIL_MVP_2026-06-11.md
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "053_recruiter_audit_events"
down_revision: Union[str, None] = "052_calendar_access_token_cache"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.has_table(bind, "recruiter_audit_events"):
        return
    op.create_table(
        "recruiter_audit_events",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("application_id", sa.Integer(), nullable=False),
        sa.Column("company_slug", sa.String(length=80), nullable=False),
        sa.Column("action_type", sa.String(length=64), nullable=False),
        sa.Column("meta_json", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.ForeignKeyConstraint(["application_id"], ["applications.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_recruiter_audit_events_application_id", "recruiter_audit_events", ["application_id"])
    op.create_index("ix_recruiter_audit_events_company_slug", "recruiter_audit_events", ["company_slug"])
    op.create_index("ix_recruiter_audit_events_created_at", "recruiter_audit_events", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_recruiter_audit_events_created_at", table_name="recruiter_audit_events")
    op.drop_index("ix_recruiter_audit_events_company_slug", table_name="recruiter_audit_events")
    op.drop_index("ix_recruiter_audit_events_application_id", table_name="recruiter_audit_events")
    op.drop_table("recruiter_audit_events")
