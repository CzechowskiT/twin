"""Interview & Decision Copilot — evidence-backed prep and offer decisions (no external acts).

Revision ID: 113_interview_decision_copilot
Revises: 112_application_studio
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "113_interview_decision_copilot"
down_revision: Union[str, None] = "112_application_studio"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "candidate_interview_processes",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("process_key", sa.String(length=160), nullable=False),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("status", sa.String(length=48), nullable=False, server_default="active"),
        sa.Column("workspace_id", sa.Integer(), nullable=True),
        sa.Column("application_id", sa.Integer(), nullable=True),
        sa.Column("company", sa.String(length=300), nullable=False, server_default="UNKNOWN"),
        sa.Column("role_title", sa.String(length=300), nullable=False, server_default="UNKNOWN"),
        sa.Column("submitted_snapshot_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("snapshot_immutable", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("snapshot_hash", sa.String(length=64), nullable=True),
        sa.Column("expectations_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("hypotheses_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("coverage_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("candidate_questions_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("company_brief_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("prep_gate_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("outcome_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="SUGGESTION"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("is_synthetic", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("payload_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "process_key", name="uq_interview_process_key"),
    )
    op.create_index("ix_interview_processes_candidate_id", "candidate_interview_processes", ["candidate_id"])

    op.create_table(
        "candidate_interview_stages",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("process_id", sa.Integer(), sa.ForeignKey("candidate_interview_processes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("stage_key", sa.String(length=160), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("stage_kind", sa.String(length=64), nullable=False, server_default="screen"),
        sa.Column("status", sa.String(length=48), nullable=False, server_default="planned"),
        sa.Column("expectations_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("hypotheses_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("prep_gate_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("adaptation_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="SUGGESTION"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "stage_key", name="uq_interview_stage_key"),
    )
    op.create_index("ix_interview_stages_process_id", "candidate_interview_stages", ["process_id"])

    op.create_table(
        "candidate_interview_answers",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("process_id", sa.Integer(), sa.ForeignKey("candidate_interview_processes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("stage_id", sa.Integer(), nullable=True),
        sa.Column("answer_key", sa.String(length=160), nullable=False),
        sa.Column("question", sa.Text(), nullable=False),
        sa.Column("likelihood", sa.String(length=32), nullable=False, server_default="POSSIBLE"),
        sa.Column("outline_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("answer_text", sa.Text(), nullable=False, server_default=""),
        sa.Column("evidence_ids_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("story_ids_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("audit_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="SUGGESTION"),
        sa.Column("approved", sa.Boolean(), nullable=True),
        sa.Column("fabricated", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "answer_key", name="uq_interview_answer_key"),
    )

    op.create_table(
        "candidate_interview_mocks",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("process_id", sa.Integer(), sa.ForeignKey("candidate_interview_processes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("stage_id", sa.Integer(), nullable=True),
        sa.Column("mock_key", sa.String(length=160), nullable=False),
        sa.Column("mode", sa.String(length=48), nullable=False, server_default="practice"),
        sa.Column("questions_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("assessment_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("feedback_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("covert_assistance", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("emotion_scoring", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("personality_scoring", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="SUGGESTION"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "mock_key", name="uq_interview_mock_key"),
    )

    op.create_table(
        "candidate_interview_events",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("process_id", sa.Integer(), sa.ForeignKey("candidate_interview_processes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("stage_id", sa.Integer(), nullable=True),
        sa.Column("event_key", sa.String(length=160), nullable=False),
        sa.Column("recollection_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("provenance", sa.String(length=64), nullable=False, server_default="candidate_recollection"),
        sa.Column("notes_confidential", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("transcript_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="CANDIDATE_CONFIRMED"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "event_key", name="uq_interview_event_key"),
    )

    op.create_table(
        "candidate_interview_feedback",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("process_id", sa.Integer(), sa.ForeignKey("candidate_interview_processes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("feedback_key", sa.String(length=160), nullable=False),
        sa.Column("employer_raw_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("candidate_interpretation_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("analysis_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("provenance", sa.String(length=64), nullable=False, server_default="candidate_entered"),
        sa.Column("auto_creates_offer", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="UNKNOWN"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "feedback_key", name="uq_interview_feedback_key"),
    )

    op.create_table(
        "candidate_offer_records",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("process_id", sa.Integer(), sa.ForeignKey("candidate_interview_processes.id", ondelete="CASCADE"), nullable=True),
        sa.Column("offer_key", sa.String(length=160), nullable=False),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("company", sa.String(length=300), nullable=False, server_default="UNKNOWN"),
        sa.Column("provenance", sa.String(length=64), nullable=False, server_default="candidate_declared"),
        sa.Column("terms_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("ambiguity_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("comparison_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("scenarios_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("negotiation_prep_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("external_negotiation", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("external_accept", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="CANDIDATE_CONFIRMED"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "offer_key", name="uq_offer_record_key"),
    )

    op.create_table(
        "candidate_decision_memos",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("process_id", sa.Integer(), sa.ForeignKey("candidate_interview_processes.id", ondelete="CASCADE"), nullable=True),
        sa.Column("offer_id", sa.Integer(), nullable=True),
        sa.Column("memo_key", sa.String(length=160), nullable=False),
        sa.Column("criteria_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("memo_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("declared_decision", sa.String(length=64), nullable=True),
        sa.Column("provenance", sa.String(length=64), nullable=False, server_default="none"),
        sa.Column("external_action", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="SUGGESTION"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "memo_key", name="uq_decision_memo_key"),
    )

    op.create_table(
        "candidate_interview_privacy",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("ai_prep_opt_in", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("transcript_retention_opt_in", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("export_include_transcripts", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("paused", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", name="uq_interview_privacy_candidate"),
    )

    op.create_table(
        "candidate_interview_audits",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("process_id", sa.Integer(), nullable=True),
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
        "candidate_interview_audits",
        "candidate_interview_privacy",
        "candidate_decision_memos",
        "candidate_offer_records",
        "candidate_interview_feedback",
        "candidate_interview_events",
        "candidate_interview_mocks",
        "candidate_interview_answers",
        "candidate_interview_stages",
        "candidate_interview_processes",
    ):
        op.drop_table(t)
