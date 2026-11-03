"""Career Transition, First 90 Days & Outcome Learning (no workplace monitoring / external acts).

Revision ID: 114_career_transition_outcome_learning
Revises: 113_interview_decision_copilot
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "114_career_transition_outcome_learning"
down_revision: Union[str, None] = "113_interview_decision_copilot"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "candidate_career_outcomes",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("outcome_key", sa.String(length=160), nullable=False),
        sa.Column("outcome_type", sa.String(length=64), nullable=False),
        sa.Column("application_id", sa.Integer(), nullable=True),
        sa.Column("process_id", sa.Integer(), nullable=True),
        sa.Column("offer_id", sa.Integer(), nullable=True),
        sa.Column("decision_id", sa.Integer(), nullable=True),
        sa.Column("transition_id", sa.Integer(), nullable=True),
        sa.Column("source_type", sa.String(length=64), nullable=False, server_default="candidate_declared"),
        sa.Column("source_date", sa.DateTime(), nullable=True),
        sa.Column("candidate_confirmed", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="CANDIDATE_CONFIRMED"),
        sa.Column("confidence", sa.String(length=16), nullable=False, server_default="medium"),
        sa.Column("outcome_date", sa.DateTime(), nullable=True),
        sa.Column("privacy", sa.String(length=40), nullable=False, server_default="PRIVATE"),
        sa.Column("payload_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("prediction_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_synthetic", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "outcome_key", name="uq_career_outcome_key"),
    )
    op.create_index("ix_career_outcomes_candidate_id", "candidate_career_outcomes", ["candidate_id"])

    op.create_table(
        "candidate_transition_workspaces",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("workspace_key", sa.String(length=160), nullable=False),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("status", sa.String(length=48), nullable=False, server_default="active"),
        sa.Column("decision_id", sa.Integer(), nullable=False),
        sa.Column("offer_id", sa.Integer(), nullable=True),
        sa.Column("process_id", sa.Integer(), nullable=True),
        sa.Column("decision_snapshot_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("offer_snapshot_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("decision_snapshot_hash", sa.String(length=64), nullable=True),
        sa.Column("offer_snapshot_hash", sa.String(length=64), nullable=True),
        sa.Column("snapshots_immutable", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("readiness_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("pre_start_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("resignation_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("handover_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("clarification_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("first_day_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("first_week_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("plan_90_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("plan_90_status", sa.String(length=32), nullable=False, server_default="AI_DRAFT"),
        sa.Column("expectations_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("stakeholders_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("cockpit_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("learning_plan_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("risks_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("retrospective_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("graph_update_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="SUGGESTION"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("is_synthetic", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("payload_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "workspace_key", name="uq_transition_workspace_key"),
    )
    op.create_index("ix_transition_workspaces_candidate_id", "candidate_transition_workspaces", ["candidate_id"])

    op.create_table(
        "candidate_transition_checkins",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("transition_id", sa.Integer(), sa.ForeignKey("candidate_transition_workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("checkin_key", sa.String(length=160), nullable=False),
        sa.Column("period", sa.String(length=32), nullable=False, server_default="week_1"),
        sa.Column("facts_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("interpretation_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("provenance_facts", sa.String(length=64), nullable=False, server_default="candidate_reported"),
        sa.Column("provenance_interpretation", sa.String(length=64), nullable=False, server_default="candidate_interpretation"),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="CANDIDATE_REPORTED"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "checkin_key", name="uq_transition_checkin_key"),
    )

    op.create_table(
        "candidate_transition_milestones",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("transition_id", sa.Integer(), sa.ForeignKey("candidate_transition_workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("milestone_key", sa.String(length=160), nullable=False),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="planned"),
        sa.Column("evidence_ids_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="SUGGESTION"),
        sa.Column("due_label", sa.String(length=64), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "milestone_key", name="uq_transition_milestone_key"),
    )

    op.create_table(
        "candidate_transition_calibrations",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("calibration_key", sa.String(length=160), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("weights_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("explain_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("outcome_ids_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("supersedes_id", sa.Integer(), nullable=True),
        sa.Column("reverted_from_id", sa.Integer(), nullable=True),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="INFERENCE"),
        sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("archived_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "calibration_key", name="uq_transition_calibration_key"),
    )

    op.create_table(
        "candidate_transition_privacy",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("learning_opt_in", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("reminders_opt_in", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("export_include_employer_notes", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("paused", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", name="uq_transition_privacy_candidate"),
    )

    op.create_table(
        "candidate_transition_audits",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("transition_id", sa.Integer(), nullable=True),
        sa.Column("entity_type", sa.String(length=64), nullable=False),
        sa.Column("entity_id", sa.Integer(), nullable=True),
        sa.Column("action", sa.String(length=64), nullable=False),
        sa.Column("before_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("after_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    for t in (
        "candidate_transition_audits",
        "candidate_transition_privacy",
        "candidate_transition_calibrations",
        "candidate_transition_milestones",
        "candidate_transition_checkins",
        "candidate_transition_workspaces",
        "candidate_career_outcomes",
    ):
        op.drop_table(t)
