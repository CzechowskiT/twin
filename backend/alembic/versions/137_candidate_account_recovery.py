"""Epic 2.23 — extend password_reset_tokens + step-up + recovery receipts.

Revision ID: 137_candidate_account_recovery
Revises: 136_candidate_auth_session

Additive only. No canary/invite DML. MFA/passkeys not in scope.
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "137_candidate_account_recovery"
down_revision: Union[str, None] = "136_candidate_auth_session"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(name: str) -> bool:
    conn = op.get_bind()
    rows = conn.execute(
        sa.text(
            "SELECT 1 FROM information_schema.tables "
            "WHERE table_name = :n LIMIT 1"
        ),
        {"n": name},
    ).fetchall()
    return bool(rows)


def _has_column(table: str, column: str) -> bool:
    conn = op.get_bind()
    rows = conn.execute(
        sa.text(
            "SELECT 1 FROM information_schema.columns "
            "WHERE table_name = :t AND column_name = :c LIMIT 1"
        ),
        {"t": table, "c": column},
    ).fetchall()
    return bool(rows)


def upgrade() -> None:
    if _has_table("password_reset_tokens"):
        if not _has_column("password_reset_tokens", "schema_version"):
            op.add_column(
                "password_reset_tokens",
                sa.Column(
                    "schema_version",
                    sa.String(length=64),
                    nullable=False,
                    server_default="twin.candidate_account_recovery/v1",
                ),
            )
        if not _has_column("password_reset_tokens", "state"):
            op.add_column(
                "password_reset_tokens",
                sa.Column(
                    "state",
                    sa.String(length=32),
                    nullable=False,
                    server_default="ACTIVE",
                ),
            )
            op.create_index(
                "ix_password_reset_tokens_state",
                "password_reset_tokens",
                ["state"],
            )
        if not _has_column("password_reset_tokens", "used_at"):
            op.add_column(
                "password_reset_tokens",
                sa.Column("used_at", sa.DateTime(), nullable=True),
            )
        if not _has_column("password_reset_tokens", "cancelled_at"):
            op.add_column(
                "password_reset_tokens",
                sa.Column("cancelled_at", sa.DateTime(), nullable=True),
            )
        if not _has_column("password_reset_tokens", "kpi_excluded"):
            op.add_column(
                "password_reset_tokens",
                sa.Column(
                    "kpi_excluded",
                    sa.Boolean(),
                    nullable=False,
                    server_default=sa.text("false"),
                ),
            )

    if not _has_table("candidate_step_up_challenges"):
        op.create_table(
            "candidate_step_up_challenges",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column(
                "user_id",
                sa.Integer(),
                sa.ForeignKey("users.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("challenge_key", sa.String(length=64), nullable=False),
            sa.Column("token_digest", sa.String(length=128), nullable=False),
            sa.Column("purpose", sa.String(length=64), nullable=False),
            sa.Column("session_key", sa.String(length=64), nullable=True),
            sa.Column("session_epoch", sa.Integer(), nullable=True),
            sa.Column("state", sa.String(length=32), nullable=False, server_default="ACTIVE"),
            sa.Column(
                "schema_version",
                sa.String(length=64),
                nullable=False,
                server_default="twin.candidate_step_up_reauthentication/v1",
            ),
            sa.Column("expires_at", sa.DateTime(), nullable=False),
            sa.Column("used_at", sa.DateTime(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column(
                "kpi_excluded",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("true"),
            ),
            sa.UniqueConstraint("challenge_key", name="uq_step_up_challenge_key"),
            sa.UniqueConstraint("token_digest", name="uq_step_up_token_digest"),
        )
        op.create_index("ix_step_up_user", "candidate_step_up_challenges", ["user_id"])
        op.create_index("ix_step_up_state", "candidate_step_up_challenges", ["state"])
        op.create_index("ix_step_up_purpose", "candidate_step_up_challenges", ["purpose"])

    if not _has_table("candidate_recovery_security_receipts"):
        op.create_table(
            "candidate_recovery_security_receipts",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column(
                "user_id",
                sa.Integer(),
                sa.ForeignKey("users.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("receipt_key", sa.String(length=64), nullable=False),
            sa.Column("event_kind", sa.String(length=64), nullable=False),
            sa.Column("payload_json", sa.Text(), nullable=False, server_default="{}"),
            sa.Column(
                "schema_version",
                sa.String(length=64),
                nullable=False,
                server_default="twin.candidate_recovery_completion/v1",
            ),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column(
                "kpi_excluded",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("true"),
            ),
            sa.UniqueConstraint("receipt_key", name="uq_recovery_receipt_key"),
        )
        op.create_index(
            "ix_recovery_receipt_user",
            "candidate_recovery_security_receipts",
            ["user_id"],
        )


def downgrade() -> None:
    if _has_table("candidate_recovery_security_receipts"):
        op.drop_table("candidate_recovery_security_receipts")
    if _has_table("candidate_step_up_challenges"):
        op.drop_table("candidate_step_up_challenges")
    # Keep password_reset_tokens columns (non-destructive downgrade)
