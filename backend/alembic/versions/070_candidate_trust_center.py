"""Candidate trust center persistence (Wave B slice 2)."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "070_candidate_trust_center"
down_revision: Union[str, None] = "069_candidate_career_compass"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    for table in (
        "candidate_consent_receipts",
        "candidate_privacy_requests",
        "candidate_trust_audit_events",
    ):
        exists = conn.execute(
            sa.text(
                "SELECT 1 FROM information_schema.tables "
                "WHERE table_schema = 'public' AND table_name = :name LIMIT 1"
            ),
            {"name": table},
        ).fetchone()
        if exists:
            return

    op.create_table(
        "candidate_consent_receipts",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), nullable=False),
        sa.Column("consent_purpose", sa.String(length=64), nullable=False),
        sa.Column("action", sa.String(length=32), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="issued"),
        sa.Column("payload_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("idempotency_key", sa.String(length=128), nullable=True),
        sa.Column("created_by_user_id", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.ForeignKeyConstraint(["candidate_id"], ["candidates.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "candidate_id",
            "idempotency_key",
            name="uq_candidate_consent_receipt_idempotency",
        ),
    )
    op.create_index(
        "ix_candidate_consent_receipts_candidate_id",
        "candidate_consent_receipts",
        ["candidate_id"],
    )
    op.create_index(
        "ix_candidate_consent_receipts_purpose",
        "candidate_consent_receipts",
        ["consent_purpose"],
    )

    op.create_table(
        "candidate_privacy_requests",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), nullable=False),
        sa.Column("request_type", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="open"),
        sa.Column("payload_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("idempotency_key", sa.String(length=128), nullable=True),
        sa.Column("created_by_user_id", sa.Integer(), nullable=False),
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
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["candidate_id"], ["candidates.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "candidate_id",
            "idempotency_key",
            name="uq_candidate_privacy_request_idempotency",
        ),
    )
    op.create_index(
        "ix_candidate_privacy_requests_candidate_id",
        "candidate_privacy_requests",
        ["candidate_id"],
    )
    op.create_index(
        "ix_candidate_privacy_requests_type_status",
        "candidate_privacy_requests",
        ["request_type", "status"],
    )

    op.create_table(
        "candidate_trust_audit_events",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), nullable=False),
        sa.Column("event_type", sa.String(length=64), nullable=False),
        sa.Column("summary", sa.String(length=500), nullable=False),
        sa.Column("metadata_json", sa.Text(), nullable=True),
        sa.Column("actor", sa.String(length=32), nullable=False, server_default="candidate"),
        sa.Column("actor_user_id", sa.Integer(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.ForeignKeyConstraint(["candidate_id"], ["candidates.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_candidate_trust_audit_events_candidate_id",
        "candidate_trust_audit_events",
        ["candidate_id"],
    )
    op.create_index(
        "ix_candidate_trust_audit_events_event_type",
        "candidate_trust_audit_events",
        ["event_type"],
    )
    op.create_index(
        "ix_candidate_trust_audit_events_created_at",
        "candidate_trust_audit_events",
        ["created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_candidate_trust_audit_events_created_at", table_name="candidate_trust_audit_events")
    op.drop_index("ix_candidate_trust_audit_events_event_type", table_name="candidate_trust_audit_events")
    op.drop_index("ix_candidate_trust_audit_events_candidate_id", table_name="candidate_trust_audit_events")
    op.drop_table("candidate_trust_audit_events")
    op.drop_index("ix_candidate_privacy_requests_type_status", table_name="candidate_privacy_requests")
    op.drop_index("ix_candidate_privacy_requests_candidate_id", table_name="candidate_privacy_requests")
    op.drop_table("candidate_privacy_requests")
    op.drop_index("ix_candidate_consent_receipts_purpose", table_name="candidate_consent_receipts")
    op.drop_index("ix_candidate_consent_receipts_candidate_id", table_name="candidate_consent_receipts")
    op.drop_table("candidate_consent_receipts")
