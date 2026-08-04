"""Unified Career Lifecycle Command Center (orchestration only — no duplicate module stores).

Revision ID: 115_unified_career_lifecycle
Revises: 114_career_transition_outcome_learning
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "115_unified_career_lifecycle"
down_revision: Union[str, None] = "114_career_transition_outcome_learning"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "candidate_lifecycle_contexts",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("context_key", sa.String(length=160), nullable=False),
        sa.Column("active_phase", sa.String(length=48), nullable=False, server_default="UNDERSTAND"),
        sa.Column("proposed_phase", sa.String(length=48), nullable=True),
        sa.Column("phase_source", sa.String(length=64), nullable=False, server_default="inferred"),
        sa.Column("phase_confidence", sa.String(length=16), nullable=False, server_default="low"),
        sa.Column("candidate_phase_confirmed", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("active_goal", sa.String(length=300), nullable=True),
        sa.Column("focus_type", sa.String(length=64), nullable=True),
        sa.Column("focus_ref", sa.String(length=160), nullable=True),
        sa.Column("refs_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("unknowns_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("blocking_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("nba_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("readiness_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("preferences_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("deep_link_context_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("context_version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="INFERENCE"),
        sa.Column("archived_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.Column("is_synthetic", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "context_key", name="uq_lifecycle_context_key"),
    )
    op.create_index("ix_lifecycle_contexts_candidate_id", "candidate_lifecycle_contexts", ["candidate_id"])

    op.create_table(
        "candidate_lifecycle_events",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("context_id", sa.Integer(), sa.ForeignKey("candidate_lifecycle_contexts.id", ondelete="CASCADE"), nullable=True),
        sa.Column("event_key", sa.String(length=160), nullable=False),
        sa.Column("event_type", sa.String(length=64), nullable=False),
        sa.Column("source_module", sa.String(length=64), nullable=False),
        sa.Column("source_object_id", sa.String(length=64), nullable=True),
        sa.Column("source_version", sa.Integer(), nullable=True),
        sa.Column("provenance", sa.String(length=64), nullable=False, server_default="system"),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="FACT"),
        sa.Column("candidate_confirmed", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("context_version_before", sa.Integer(), nullable=True),
        sa.Column("context_version_after", sa.Integer(), nullable=True),
        sa.Column("payload_ref_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("is_synthetic", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "event_key", name="uq_lifecycle_event_key"),
    )
    op.create_index("ix_lifecycle_events_candidate_id", "candidate_lifecycle_events", ["candidate_id"])

    op.create_table(
        "candidate_lifecycle_handoffs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("context_id", sa.Integer(), nullable=True),
        sa.Column("handoff_key", sa.String(length=160), nullable=False),
        sa.Column("from_module", sa.String(length=64), nullable=False),
        sa.Column("to_module", sa.String(length=64), nullable=False),
        sa.Column("from_object_id", sa.String(length=64), nullable=True),
        sa.Column("to_object_id", sa.String(length=64), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("snapshot_hash", sa.String(length=64), nullable=True),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="FACT"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "handoff_key", name="uq_lifecycle_handoff_key"),
    )

    op.create_table(
        "candidate_lifecycle_findings",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("context_id", sa.Integer(), nullable=True),
        sa.Column("finding_key", sa.String(length=160), nullable=False),
        sa.Column("finding_type", sa.String(length=64), nullable=False),
        sa.Column("severity", sa.String(length=16), nullable=False, server_default="info"),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="open"),
        sa.Column("module_refs_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("message", sa.String(length=500), nullable=False, server_default=""),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="INFERENCE"),
        sa.Column("stale", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("resolved_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "finding_key", name="uq_lifecycle_finding_key"),
    )

    op.create_table(
        "candidate_lifecycle_approvals",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("context_id", sa.Integer(), nullable=True),
        sa.Column("approval_key", sa.String(length=160), nullable=False),
        sa.Column("approval_kind", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("bundled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("before_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("after_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="SUGGESTION"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("resolved_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "approval_key", name="uq_lifecycle_approval_key"),
    )

    op.create_table(
        "candidate_lifecycle_privacy",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("orchestration_opt_in", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("search_opt_in", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("learning_opt_in", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("reminders_opt_in", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("export_include_module_notes", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("paused", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", name="uq_lifecycle_privacy_candidate"),
    )

    op.create_table(
        "candidate_lifecycle_audits",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("context_id", sa.Integer(), nullable=True),
        sa.Column("entity_type", sa.String(length=64), nullable=False),
        sa.Column("entity_id", sa.Integer(), nullable=True),
        sa.Column("action", sa.String(length=64), nullable=False),
        sa.Column("before_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("after_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_lifecycle_audits_candidate_id", "candidate_lifecycle_audits", ["candidate_id"])


def downgrade() -> None:
    op.drop_index("ix_lifecycle_audits_candidate_id", table_name="candidate_lifecycle_audits")
    op.drop_table("candidate_lifecycle_audits")
    op.drop_table("candidate_lifecycle_privacy")
    op.drop_table("candidate_lifecycle_approvals")
    op.drop_table("candidate_lifecycle_findings")
    op.drop_table("candidate_lifecycle_handoffs")
    op.drop_index("ix_lifecycle_events_candidate_id", table_name="candidate_lifecycle_events")
    op.drop_table("candidate_lifecycle_events")
    op.drop_index("ix_lifecycle_contexts_candidate_id", table_name="candidate_lifecycle_contexts")
    op.drop_table("candidate_lifecycle_contexts")
