"""Epic 2.22 — additive managed auth sessions + refresh families.

Revision ID: 136_candidate_auth_session
Revises: 135_candidate_career_pack_share

No raw tokens/IP/UA/fingerprint. Digests only for refresh.
No canary/invite DML. PARALLEL_IDENTITY_STORE=NONE.
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "136_candidate_auth_session"
down_revision: Union[str, None] = "135_candidate_career_pack_share"
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


def upgrade() -> None:
    if not _has_table("candidate_auth_sessions"):
        op.create_table(
            "candidate_auth_sessions",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column(
                "user_id",
                sa.Integer(),
                sa.ForeignKey("users.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("session_key", sa.String(length=64), nullable=False),
            sa.Column("family_key", sa.String(length=64), nullable=False),
            sa.Column("epoch", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("state", sa.String(length=32), nullable=False, server_default="ACTIVE"),
            sa.Column(
                "schema_version",
                sa.String(length=64),
                nullable=False,
                server_default="twin.candidate_auth_session/v1",
            ),
            sa.Column("label", sa.String(length=64), nullable=False, server_default="session"),
            sa.Column("expires_at", sa.DateTime(), nullable=False),
            sa.Column("revoked_at", sa.DateTime(), nullable=True),
            sa.Column("revoke_reason", sa.String(length=64), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("updated_at", sa.DateTime(), nullable=True),
            sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column(
                "first_value_satisfied",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("false"),
            ),
            sa.UniqueConstraint("session_key", name="uq_candidate_auth_session_key"),
            sa.UniqueConstraint("user_id", "family_key", name="uq_candidate_auth_user_family"),
        )
        op.create_index("ix_cas_user", "candidate_auth_sessions", ["user_id"])
        op.create_index("ix_cas_state", "candidate_auth_sessions", ["state"])
        op.create_index("ix_cas_family", "candidate_auth_sessions", ["family_key"])

    if not _has_table("candidate_refresh_token_families"):
        op.create_table(
            "candidate_refresh_token_families",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column(
                "user_id",
                sa.Integer(),
                sa.ForeignKey("users.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column(
                "session_id",
                sa.Integer(),
                sa.ForeignKey("candidate_auth_sessions.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("family_key", sa.String(length=64), nullable=False),
            sa.Column("generation", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("current_digest", sa.String(length=128), nullable=False),
            sa.Column("previous_digest", sa.String(length=128), nullable=True),
            sa.Column("state", sa.String(length=32), nullable=False, server_default="ACTIVE"),
            sa.Column(
                "schema_version",
                sa.String(length=64),
                nullable=False,
                server_default="twin.candidate_refresh_token_family/v1",
            ),
            sa.Column("expires_at", sa.DateTime(), nullable=False),
            sa.Column("rotated_at", sa.DateTime(), nullable=True),
            sa.Column("reuse_detected_at", sa.DateTime(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("updated_at", sa.DateTime(), nullable=True),
            sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.UniqueConstraint("family_key", name="uq_candidate_refresh_family_key"),
        )
        op.create_index("ix_crtf_user", "candidate_refresh_token_families", ["user_id"])
        op.create_index("ix_crtf_session", "candidate_refresh_token_families", ["session_id"])
        op.create_index("ix_crtf_state", "candidate_refresh_token_families", ["state"])


def downgrade() -> None:
    if _has_table("candidate_refresh_token_families"):
        op.drop_table("candidate_refresh_token_families")
    if _has_table("candidate_auth_sessions"):
        op.drop_table("candidate_auth_sessions")
