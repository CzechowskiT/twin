"""Founder Command Center tables."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "083_founder_command"
down_revision: Union[str, None] = "082_agent_dispatch_execution_contract"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(name: str) -> bool:
    bind = op.get_bind()
    return name in inspect(bind).get_table_names()


def _has_index(table: str, index_name: str) -> bool:
    bind = op.get_bind()
    return any(ix["name"] == index_name for ix in inspect(bind).get_indexes(table))


def upgrade() -> None:
    if not _has_table("founder_commands"):
        op.create_table(
            "founder_commands",
            sa.Column("id", sa.String(length=36), primary_key=True),
            sa.Column("status", sa.String(length=32), nullable=False, server_default="draft"),
            sa.Column("current_stage", sa.String(length=64), nullable=True),
            sa.Column("direction", sa.Text(), nullable=False),
            sa.Column("autonomy_level", sa.Integer(), nullable=False, server_default="3"),
            sa.Column("batch_index", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("max_batches", sa.Integer(), nullable=False, server_default="5"),
            sa.Column("max_runtime_minutes", sa.Integer(), nullable=False, server_default="180"),
            sa.Column("max_consecutive_failures", sa.Integer(), nullable=False, server_default="2"),
            sa.Column("max_retries_per_stage", sa.Integer(), nullable=False, server_default="3"),
            sa.Column("max_open_prs", sa.Integer(), nullable=False, server_default="3"),
            sa.Column("max_active_runs", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("stage_retry_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("consecutive_failures", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("plan_json", sa.Text(), nullable=True),
            sa.Column("plan_hash", sa.String(length=64), nullable=True),
            sa.Column("project_state_json", sa.Text(), nullable=True),
            sa.Column("links_json", sa.Text(), nullable=True),
            sa.Column("live_summary", sa.Text(), nullable=True),
            sa.Column("final_summary", sa.Text(), nullable=True),
            sa.Column("dispatch_run_id", sa.String(length=36), nullable=True),
            sa.Column("idempotency_key", sa.String(length=128), nullable=True),
            sa.Column("created_by_fingerprint", sa.String(length=32), nullable=True),
            sa.Column("error_code", sa.String(length=64), nullable=True),
            sa.Column("error_message", sa.String(length=512), nullable=True),
            sa.Column("started_at", sa.DateTime(), nullable=True),
            sa.Column("finished_at", sa.DateTime(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
            sa.UniqueConstraint("idempotency_key", name="uq_founder_commands_idempotency"),
        )
    for name, cols in (
        ("ix_founder_commands_status", ["status"]),
        ("ix_founder_commands_current_stage", ["current_stage"]),
        ("ix_founder_commands_plan_hash", ["plan_hash"]),
        ("ix_founder_commands_dispatch_run_id", ["dispatch_run_id"]),
    ):
        if not _has_index("founder_commands", name):
            op.create_index(name, "founder_commands", cols)

    if not _has_table("founder_command_timeline_events"):
        op.create_table(
            "founder_command_timeline_events",
            sa.Column("id", sa.String(length=36), primary_key=True),
            sa.Column("command_id", sa.String(length=36), nullable=False),
            sa.Column("stage", sa.String(length=64), nullable=False),
            sa.Column("message", sa.String(length=512), nullable=False),
            sa.Column("detail_json", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(
                ["command_id"], ["founder_commands.id"], ondelete="CASCADE"
            ),
        )
    for name, cols in (
        ("ix_founder_command_timeline_events_command_id", ["command_id"]),
        ("ix_founder_command_timeline_events_stage", ["stage"]),
    ):
        if _has_table("founder_command_timeline_events") and not _has_index(
            "founder_command_timeline_events", name
        ):
            op.create_index(name, "founder_command_timeline_events", cols)

    if not _has_table("founder_decisions"):
        op.create_table(
            "founder_decisions",
            sa.Column("id", sa.String(length=36), primary_key=True),
            sa.Column("command_id", sa.String(length=36), nullable=False),
            sa.Column("operation", sa.String(length=64), nullable=False),
            sa.Column("title", sa.String(length=256), nullable=False),
            sa.Column("risk", sa.String(length=32), nullable=False),
            sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
            sa.Column("evidence_json", sa.Text(), nullable=True),
            sa.Column("actor_fingerprint", sa.String(length=32), nullable=True),
            sa.Column("decided_at", sa.DateTime(), nullable=True),
            sa.Column("expires_at", sa.DateTime(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(
                ["command_id"], ["founder_commands.id"], ondelete="CASCADE"
            ),
        )
    for name, cols in (
        ("ix_founder_decisions_command_id", ["command_id"]),
        ("ix_founder_decisions_status", ["status"]),
        ("ix_founder_decisions_risk", ["risk"]),
        ("ix_founder_decisions_expires_at", ["expires_at"]),
    ):
        if _has_table("founder_decisions") and not _has_index("founder_decisions", name):
            op.create_index(name, "founder_decisions", cols)

    if not _has_table("founder_command_notifications"):
        op.create_table(
            "founder_command_notifications",
            sa.Column("id", sa.String(length=36), primary_key=True),
            sa.Column("command_id", sa.String(length=36), nullable=False),
            sa.Column("kind", sa.String(length=64), nullable=False),
            sa.Column("title", sa.String(length=256), nullable=False),
            sa.Column("body", sa.Text(), nullable=False),
            sa.Column("links_json", sa.Text(), nullable=True),
            sa.Column("channel", sa.String(length=32), nullable=False, server_default="in_app"),
            sa.Column("read_at", sa.DateTime(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(
                ["command_id"], ["founder_commands.id"], ondelete="CASCADE"
            ),
        )
    for name, cols in (
        ("ix_founder_command_notifications_command_id", ["command_id"]),
        ("ix_founder_command_notifications_kind", ["kind"]),
    ):
        if _has_table("founder_command_notifications") and not _has_index(
            "founder_command_notifications", name
        ):
            op.create_index(name, "founder_command_notifications", cols)

    if not _has_table("founder_command_audit_events"):
        op.create_table(
            "founder_command_audit_events",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("command_id", sa.String(length=36), nullable=True),
            sa.Column("event_type", sa.String(length=64), nullable=False),
            sa.Column("actor_fingerprint", sa.String(length=32), nullable=True),
            sa.Column("detail_json", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
        )
    for name, cols in (
        ("ix_founder_command_audit_events_command_id", ["command_id"]),
        ("ix_founder_command_audit_events_event_type", ["event_type"]),
    ):
        if _has_table("founder_command_audit_events") and not _has_index(
            "founder_command_audit_events", name
        ):
            op.create_index(name, "founder_command_audit_events", cols)


def downgrade() -> None:
    if _has_table("founder_command_audit_events"):
        op.drop_table("founder_command_audit_events")
    if _has_table("founder_command_notifications"):
        op.drop_table("founder_command_notifications")
    if _has_table("founder_decisions"):
        op.drop_table("founder_decisions")
    if _has_table("founder_command_timeline_events"):
        op.drop_table("founder_command_timeline_events")
    if _has_table("founder_commands"):
        op.drop_table("founder_commands")
