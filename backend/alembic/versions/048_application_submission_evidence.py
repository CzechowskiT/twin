"""Honest application submission phases and evidence columns."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "048_application_submission_evidence"
down_revision: Union[str, None] = "047_job_competitive_features"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_SUBMISSION = (
    "application_created_in_twin",
    "application_prepared",
    "external_submit_attempted",
    "external_submit_confirmed",
    "external_submit_failed",
    "manual_action_required",
)
_APPLY_MODE = ("verified_auto_apply", "assisted_apply", "manual_only", "unsupported")
_CONFIRMATION = (
    "confirmation_page",
    "confirmation_email",
    "ats_application_id",
    "screenshot",
    "manual_user_confirmation",
    "api_response",
    "none",
)


def upgrade() -> None:
    op.add_column(
        "applications",
        sa.Column(
            "submission_status",
            sa.Enum(*_SUBMISSION, name="submissionstatus"),
            nullable=True,
        ),
    )
    op.add_column(
        "applications",
        sa.Column(
            "supported_apply_mode",
            sa.Enum(*_APPLY_MODE, name="supportedapplymode"),
            nullable=True,
        ),
    )
    op.add_column("applications", sa.Column("submit_attempted_at", sa.DateTime(), nullable=True))
    op.add_column("applications", sa.Column("submitted_at", sa.DateTime(), nullable=True))
    op.add_column(
        "applications",
        sa.Column(
            "confirmation_type",
            sa.Enum(*_CONFIRMATION, name="confirmationtype"),
            nullable=True,
        ),
    )
    op.add_column("applications", sa.Column("confirmation_text", sa.Text(), nullable=True))
    op.add_column("applications", sa.Column("confirmation_url", sa.String(2000), nullable=True))
    op.add_column(
        "applications", sa.Column("confirmation_screenshot_path", sa.String(512), nullable=True)
    )
    op.add_column(
        "applications",
        sa.Column("confirmation_email_detected", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.add_column("applications", sa.Column("external_application_id", sa.String(255), nullable=True))
    op.add_column("applications", sa.Column("failure_reason", sa.Text(), nullable=True))
    op.add_column(
        "applications",
        sa.Column("requires_manual_action", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.add_column("applications", sa.Column("submit_attempt_logs", sa.Text(), nullable=True))
    op.create_index("ix_applications_submission_status", "applications", ["submission_status"])

    conn = op.get_bind()
    conn.execute(
        sa.text(
            """
            UPDATE applications SET
              submission_status = CASE
                WHEN application_method = 'auto_apply_demo_simulated' THEN 'application_prepared'
                WHEN auto_applied = 1 AND status = 'applied' THEN 'external_submit_attempted'
                WHEN status = 'applied' THEN 'manual_action_required'
                WHEN status = 'pending' THEN 'application_created_in_twin'
                ELSE 'application_created_in_twin'
              END,
              supported_apply_mode = CASE
                WHEN application_method = 'auto_apply_demo_simulated' THEN 'manual_only'
                WHEN auto_applied = 1 THEN 'verified_auto_apply'
                ELSE 'manual_only'
              END,
              confirmation_type = 'none',
              requires_manual_action = CASE
                WHEN application_method = 'auto_apply_demo_simulated' THEN 1
                WHEN status = 'applied' AND (auto_applied = 0 OR auto_applied IS NULL) THEN 1
                WHEN status = 'pending' THEN 0
                ELSE 0
              END,
              submit_attempted_at = CASE WHEN auto_applied = 1 THEN applied_at ELSE NULL END
            """
        )
    )


def downgrade() -> None:
    op.drop_index("ix_applications_submission_status", table_name="applications")
    op.drop_column("applications", "submit_attempt_logs")
    op.drop_column("applications", "requires_manual_action")
    op.drop_column("applications", "failure_reason")
    op.drop_column("applications", "external_application_id")
    op.drop_column("applications", "confirmation_email_detected")
    op.drop_column("applications", "confirmation_screenshot_path")
    op.drop_column("applications", "confirmation_url")
    op.drop_column("applications", "confirmation_text")
    op.drop_column("applications", "confirmation_type")
    op.drop_column("applications", "submitted_at")
    op.drop_column("applications", "submit_attempted_at")
    op.drop_column("applications", "supported_apply_mode")
    op.drop_column("applications", "submission_status")
    op.execute("DROP TYPE IF EXISTS submissionstatus")
    op.execute("DROP TYPE IF EXISTS supportedapplymode")
    op.execute("DROP TYPE IF EXISTS confirmationtype")
