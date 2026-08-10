"""Epic 2.24 — additive TOTP MFA factor / challenge / recovery codes / assurance.

Revision ID: 138_candidate_totp_mfa
Revises: 137_candidate_account_recovery

No SMS/email OTP, WebAuthn, passkeys, or canary DML.
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "138_candidate_totp_mfa"
down_revision: Union[str, None] = "137_candidate_account_recovery"
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
    if _has_table("candidate_auth_sessions") and not _has_column(
        "candidate_auth_sessions", "assurance_level"
    ):
        op.add_column(
            "candidate_auth_sessions",
            sa.Column(
                "assurance_level",
                sa.String(length=32),
                nullable=False,
                server_default="AAL1_PRIMARY",
            ),
        )

    if not _has_table("candidate_mfa_factors"):
        op.create_table(
            "candidate_mfa_factors",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("factor_key", sa.String(length=64), nullable=False),
            sa.Column("factor_type", sa.String(length=16), nullable=False, server_default="totp"),
            sa.Column("state", sa.String(length=32), nullable=False, server_default="DISABLED"),
            sa.Column("secret_ciphertext", sa.Text(), nullable=True),
            sa.Column("secret_key_version", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("issuer_label", sa.String(length=64), nullable=False, server_default="TWIN"),
            sa.Column("account_label", sa.String(length=255), nullable=True),
            sa.Column("last_accepted_counter", sa.BigInteger(), nullable=True),
            sa.Column("schema_version", sa.String(length=64), nullable=False, server_default="twin.candidate_mfa_factor/v1"),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("verified_at", sa.DateTime(), nullable=True),
            sa.Column("enabled_at", sa.DateTime(), nullable=True),
            sa.Column("disabled_at", sa.DateTime(), nullable=True),
            sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.UniqueConstraint("factor_key", name="uq_mfa_factor_key"),
        )
        op.create_index("ix_candidate_mfa_factors_user_id", "candidate_mfa_factors", ["user_id"])
        op.create_index("ix_candidate_mfa_factors_state", "candidate_mfa_factors", ["state"])

    if not _has_table("candidate_mfa_challenges"):
        op.create_table(
            "candidate_mfa_challenges",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("challenge_key", sa.String(length=64), nullable=False),
            sa.Column("token_digest", sa.String(length=128), nullable=False),
            sa.Column("kind", sa.String(length=32), nullable=False),
            sa.Column("state", sa.String(length=32), nullable=False, server_default="ACTIVE"),
            sa.Column("schema_version", sa.String(length=64), nullable=False, server_default="twin.candidate_mfa_challenge/v1"),
            sa.Column("expires_at", sa.DateTime(), nullable=False),
            sa.Column("used_at", sa.DateTime(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.UniqueConstraint("challenge_key", name="uq_mfa_challenge_key"),
            sa.UniqueConstraint("token_digest", name="uq_mfa_challenge_digest"),
        )
        op.create_index("ix_candidate_mfa_challenges_user_id", "candidate_mfa_challenges", ["user_id"])
        op.create_index("ix_candidate_mfa_challenges_state", "candidate_mfa_challenges", ["state"])

    if not _has_table("candidate_mfa_recovery_codes"):
        op.create_table(
            "candidate_mfa_recovery_codes",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("set_key", sa.String(length=64), nullable=False),
            sa.Column("code_digest", sa.String(length=128), nullable=False),
            sa.Column("state", sa.String(length=32), nullable=False, server_default="ACTIVE"),
            sa.Column("schema_version", sa.String(length=64), nullable=False, server_default="twin.candidate_mfa_recovery_code_set/v1"),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("used_at", sa.DateTime(), nullable=True),
            sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.UniqueConstraint("code_digest", name="uq_mfa_recovery_code_digest"),
        )
        op.create_index("ix_candidate_mfa_recovery_codes_user_id", "candidate_mfa_recovery_codes", ["user_id"])
        op.create_index("ix_candidate_mfa_recovery_codes_set_key", "candidate_mfa_recovery_codes", ["set_key"])
        op.create_index("ix_candidate_mfa_recovery_codes_state", "candidate_mfa_recovery_codes", ["state"])


def downgrade() -> None:
    for t in (
        "candidate_mfa_recovery_codes",
        "candidate_mfa_challenges",
        "candidate_mfa_factors",
    ):
        if _has_table(t):
            op.drop_table(t)
    if _has_table("candidate_auth_sessions") and _has_column(
        "candidate_auth_sessions", "assurance_level"
    ):
        op.drop_column("candidate_auth_sessions", "assurance_level")
