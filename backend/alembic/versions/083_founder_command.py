"""Founder Command Center tables."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "083_founder_command"
down_revision: Union[str, None] = "082_agent_dispatch_execution_contract"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
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
    op.create_index("ix_founder_commands_status", "founder_commands", ["status"])
    op.create_index("ix_founder_commands_current_stage", "founder_commands", ["current_stage"])
    op.create_index("ix_founder_commands_plan_hash", "founder_commands", ["plan_hash"])
    op.create_index("ix_founder_commands_dispatch_run_id", "founder_commands", ["dispatch_run_id"])

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
    op.create_index(
        "ix_founder_command_timeline_events_command_id",
        "founder_command_timeline_events",
        ["command_id"],
    )
    op.create_index(
        "ix_founder_command_timeline_events_stage",
        "founder_command_timeline_events",
        ["stage"],
    )

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
    op.create_index("ix_founder_decisions_command_id", "founder_decisions", ["command_id"])
    op.create_index("ix_founder_decisions_status", "founder_decisions", ["status"])
    op.create_index("ix_founder_decisions_risk", "founder_decisions", ["risk"])
    op.create_index("ix_founder_decisions_expires_at", "founder_decisions", ["expires_at"])

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
    op.create_index(
        "ix_founder_command_notifications_command_id",
        "founder_command_notifications",
        ["command_id"],
    )
    op.create_index(
        "ix_founder_command_notifications_kind",
        "founder_command_notifications",
        ["kind"],
    )

    op.create_table(
        "founder_command_audit_events",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("command_id", sa.String(length=36), nullable=True),
        sa.Column("event_type", sa.String(length=64), nullable=False),
        sa.Column("actor_fingerprint", sa.String(length=32), nullable=True),
        sa.Column("detail_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index(
        "ix_founder_command_audit_events_command_id",
        "founder_command_audit_events",
        ["command_id"],
    )
    op.create_index(
        "ix_founder_command_audit_events_event_type",
        "founder_command_audit_events",
        ["event_type"],
    )


def downgrade() -> None:
    op.drop_table("founder_command_audit_events")
    op.drop_table("founder_command_notifications")
    op.drop_table("founder_decisions")
    op.drop_table("founder_command_timeline_events")
    op.drop_table("founder_commands")
