"""Agent Dispatcher tables — runs, locks, webhooks, audit."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "078_agent_dispatch"
down_revision: Union[str, None] = "077_candidate_activity_timeline"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "agent_dispatch_runs",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="queued"),
        sa.Column("repository_url", sa.String(length=512), nullable=False),
        sa.Column("base_branch", sa.String(length=255), nullable=False),
        sa.Column("requested_branch_name", sa.String(length=255), nullable=True),
        sa.Column("auto_create_pr", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("model_id", sa.String(length=128), nullable=True),
        sa.Column("prompt_envelope_version", sa.String(length=64), nullable=False),
        sa.Column("prompt_hash", sa.String(length=64), nullable=False),
        sa.Column("prompt_redacted_preview", sa.Text(), nullable=True),
        sa.Column("prompt_ciphertext", sa.Text(), nullable=True),
        sa.Column("prompt_expires_at", sa.DateTime(), nullable=True),
        sa.Column("cursor_api_version", sa.String(length=8), nullable=True),
        sa.Column("cursor_agent_id", sa.String(length=128), nullable=True),
        sa.Column("cursor_run_id", sa.String(length=128), nullable=True),
        sa.Column("cursor_status", sa.String(length=64), nullable=True),
        sa.Column("cursor_agent_url", sa.String(length=512), nullable=True),
        sa.Column("webhook_secret_fingerprint", sa.String(length=32), nullable=True),
        sa.Column("result_branch", sa.String(length=255), nullable=True),
        sa.Column("result_pr_url", sa.String(length=512), nullable=True),
        sa.Column("result_head_sha", sa.String(length=64), nullable=True),
        sa.Column("result_ci_status", sa.String(length=32), nullable=True),
        sa.Column("result_summary", sa.Text(), nullable=True),
        sa.Column("github_enrichment_json", sa.Text(), nullable=True),
        sa.Column("error_code", sa.String(length=64), nullable=True),
        sa.Column("error_message", sa.String(length=512), nullable=True),
        sa.Column("idempotency_key", sa.String(length=128), nullable=True),
        sa.Column("created_by_fingerprint", sa.String(length=32), nullable=True),
        sa.Column("metadata_json", sa.Text(), nullable=True),
        sa.Column("lease_expires_at", sa.DateTime(), nullable=True),
        sa.Column("last_polled_at", sa.DateTime(), nullable=True),
        sa.Column("dispatched_at", sa.DateTime(), nullable=True),
        sa.Column("finished_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("idempotency_key", name="uq_agent_dispatch_runs_idempotency"),
    )
    op.create_index("ix_agent_dispatch_runs_status", "agent_dispatch_runs", ["status"])
    op.create_index("ix_agent_dispatch_runs_repo", "agent_dispatch_runs", ["repository_url"])
    op.create_index("ix_agent_dispatch_runs_base_branch", "agent_dispatch_runs", ["base_branch"])
    op.create_index("ix_agent_dispatch_runs_prompt_hash", "agent_dispatch_runs", ["prompt_hash"])
    op.create_index("ix_agent_dispatch_runs_cursor_agent", "agent_dispatch_runs", ["cursor_agent_id"])

    op.create_table(
        "agent_dispatch_locks",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("repo_url", sa.String(length=512), nullable=False),
        sa.Column("base_branch", sa.String(length=255), nullable=False),
        sa.Column("run_id", sa.String(length=36), sa.ForeignKey("agent_dispatch_runs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("holder_fingerprint", sa.String(length=32), nullable=True),
        sa.Column("lease_expires_at", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("repo_url", "base_branch", name="uq_agent_dispatch_lock_repo_branch"),
    )
    op.create_index("ix_agent_dispatch_locks_run_id", "agent_dispatch_locks", ["run_id"])
    op.create_index("ix_agent_dispatch_locks_lease", "agent_dispatch_locks", ["lease_expires_at"])

    op.create_table(
        "agent_dispatch_webhook_events",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("delivery_id", sa.String(length=128), nullable=False),
        sa.Column("event_name", sa.String(length=64), nullable=False),
        sa.Column("cursor_agent_id", sa.String(length=128), nullable=True),
        sa.Column("run_id", sa.String(length=36), nullable=True),
        sa.Column("payload_json", sa.Text(), nullable=True),
        sa.Column("received_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("delivery_id", name="uq_agent_dispatch_webhook_delivery"),
    )
    op.create_index("ix_agent_dispatch_webhook_agent", "agent_dispatch_webhook_events", ["cursor_agent_id"])

    op.create_table(
        "agent_dispatch_audit_events",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("run_id", sa.String(length=36), nullable=True),
        sa.Column("event_type", sa.String(length=64), nullable=False),
        sa.Column("actor_fingerprint", sa.String(length=32), nullable=True),
        sa.Column("detail_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_agent_dispatch_audit_run", "agent_dispatch_audit_events", ["run_id"])
    op.create_index("ix_agent_dispatch_audit_type", "agent_dispatch_audit_events", ["event_type"])


def downgrade() -> None:
    op.drop_table("agent_dispatch_audit_events")
    op.drop_table("agent_dispatch_webhook_events")
    op.drop_table("agent_dispatch_locks")
    op.drop_table("agent_dispatch_runs")
