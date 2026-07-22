"""Gap-close — DSR fulfillment fields, SLA targets, ICS import holds, collaboration notes.

ORM: CandidatePrivacyRequest columns + RecruiterSlaTarget + ImportedCalendarHold + RecruiterCollaborationNote
Services: candidate_privacy_request_service, recruiter_sla, ics_import, recruiter_collaboration
Stance unchanged: Pilot BLOCKED / Gate F PENDING / Launch NO-GO / enrollment OFF.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "094_gap_close_dsr_sla_ics"
down_revision: Union[str, None] = "093_investor_wave4_hard_live"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(name: str) -> bool:
    return name in inspect(op.get_bind()).get_table_names()


def _has_column(table: str, column: str) -> bool:
    bind = op.get_bind()
    cols = {c["name"] for c in inspect(bind).get_columns(table)}
    return column in cols


def upgrade() -> None:
    if _has_table("candidate_privacy_requests"):
        if not _has_column("candidate_privacy_requests", "fulfillment_status"):
            op.add_column(
                "candidate_privacy_requests",
                sa.Column("fulfillment_status", sa.String(length=32), nullable=True),
            )
            op.create_index(
                "ix_candidate_privacy_requests_fulfillment_status",
                "candidate_privacy_requests",
                ["fulfillment_status"],
            )
        if not _has_column("candidate_privacy_requests", "fulfilled_at"):
            op.add_column(
                "candidate_privacy_requests",
                sa.Column("fulfilled_at", sa.DateTime(), nullable=True),
            )
        if not _has_column("candidate_privacy_requests", "fulfilled_by_user_id"):
            op.add_column(
                "candidate_privacy_requests",
                sa.Column("fulfilled_by_user_id", sa.Integer(), nullable=True),
            )
        if not _has_column("candidate_privacy_requests", "delivery_receipt_json"):
            op.add_column(
                "candidate_privacy_requests",
                sa.Column("delivery_receipt_json", sa.Text(), nullable=True),
            )
        if not _has_column("candidate_privacy_requests", "legal_hold"):
            op.add_column(
                "candidate_privacy_requests",
                sa.Column("legal_hold", sa.Boolean(), nullable=False, server_default=sa.text("0")),
            )

    if not _has_table("recruiter_sla_targets"):
        op.create_table(
            "recruiter_sla_targets",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("company_slug", sa.String(length=80), nullable=False),
            sa.Column("stage_key", sa.String(length=64), nullable=False),
            sa.Column("target_hours", sa.Integer(), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("company_slug", "stage_key", name="uq_recruiter_sla_company_stage"),
        )
        op.create_index("ix_recruiter_sla_targets_company_slug", "recruiter_sla_targets", ["company_slug"])

    if not _has_table("imported_calendar_holds"):
        op.create_table(
            "imported_calendar_holds",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("uid", sa.String(length=255), nullable=False),
            sa.Column("summary", sa.String(length=500), nullable=True),
            sa.Column("starts_at", sa.DateTime(), nullable=False),
            sa.Column("ends_at", sa.DateTime(), nullable=False),
            sa.Column("timezone", sa.String(length=64), nullable=True),
            sa.Column("source", sa.String(length=32), nullable=False, server_default="ics_import"),
            sa.Column("raw_json", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("user_id", "uid", name="uq_imported_calendar_hold_user_uid"),
        )
        op.create_index("ix_imported_calendar_holds_user_id", "imported_calendar_holds", ["user_id"])
        op.create_index("ix_imported_calendar_holds_starts_at", "imported_calendar_holds", ["starts_at"])

    if not _has_table("recruiter_collaboration_notes"):
        op.create_table(
            "recruiter_collaboration_notes",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("company_slug", sa.String(length=80), nullable=False),
            sa.Column("subject_type", sa.String(length=32), nullable=False),
            sa.Column("subject_id", sa.String(length=64), nullable=False),
            sa.Column("body", sa.Text(), nullable=False),
            sa.Column("author_label", sa.String(length=128), nullable=True),
            sa.Column("created_by_user_id", sa.Integer(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(
            "ix_recruiter_collab_notes_company_subject",
            "recruiter_collaboration_notes",
            ["company_slug", "subject_type", "subject_id"],
        )


def downgrade() -> None:
    if _has_table("recruiter_collaboration_notes"):
        op.drop_index("ix_recruiter_collab_notes_company_subject", table_name="recruiter_collaboration_notes")
        op.drop_table("recruiter_collaboration_notes")
    if _has_table("imported_calendar_holds"):
        op.drop_index("ix_imported_calendar_holds_starts_at", table_name="imported_calendar_holds")
        op.drop_index("ix_imported_calendar_holds_user_id", table_name="imported_calendar_holds")
        op.drop_table("imported_calendar_holds")
    if _has_table("recruiter_sla_targets"):
        op.drop_index("ix_recruiter_sla_targets_company_slug", table_name="recruiter_sla_targets")
        op.drop_table("recruiter_sla_targets")
    if _has_table("candidate_privacy_requests"):
        for col, idx in (
            ("legal_hold", None),
            ("delivery_receipt_json", None),
            ("fulfilled_by_user_id", None),
            ("fulfilled_at", None),
            ("fulfillment_status", "ix_candidate_privacy_requests_fulfillment_status"),
        ):
            if _has_column("candidate_privacy_requests", col):
                if idx:
                    op.drop_index(idx, table_name="candidate_privacy_requests")
                op.drop_column("candidate_privacy_requests", col)
