"""Candidate referral program persistence (Wave B slice 3)."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "071_candidate_referrals"
down_revision: Union[str, None] = "070_candidate_trust_center"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    program_exists = conn.execute(
        sa.text(
            "SELECT 1 FROM information_schema.tables "
            "WHERE table_schema = 'public' AND table_name = 'candidate_referral_programs' "
            "LIMIT 1"
        )
    ).fetchone()
    if program_exists:
        return
    op.create_table(
        "candidate_referral_programs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), nullable=False),
        sa.Column("referral_code", sa.String(length=32), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["candidate_id"], ["candidates.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", name="uq_candidate_referral_programs_candidate_id"),
        sa.UniqueConstraint("referral_code", name="uq_candidate_referral_programs_referral_code"),
    )
    op.create_index(
        "ix_candidate_referral_programs_candidate_id",
        "candidate_referral_programs",
        ["candidate_id"],
        unique=False,
    )
    op.create_index(
        "ix_candidate_referral_programs_referral_code",
        "candidate_referral_programs",
        ["referral_code"],
        unique=True,
    )

    op.create_table(
        "candidate_referrals",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("program_id", sa.Integer(), nullable=False),
        sa.Column("referred_user_id", sa.Integer(), nullable=True),
        sa.Column("invite_email", sa.String(length=320), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("ref_code_used", sa.String(length=32), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("signed_up_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["program_id"], ["candidate_referral_programs.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["referred_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("referred_user_id", name="uq_candidate_referrals_referred_user_id"),
    )
    op.create_index("ix_candidate_referrals_program_id", "candidate_referrals", ["program_id"], unique=False)
    op.create_index(
        "ix_candidate_referrals_referred_user_id",
        "candidate_referrals",
        ["referred_user_id"],
        unique=False,
    )


def downgrade() -> None:
    conn = op.get_bind()
    referrals_exists = conn.execute(
        sa.text(
            "SELECT 1 FROM information_schema.tables "
            "WHERE table_schema = 'public' AND table_name = 'candidate_referrals' "
            "LIMIT 1"
        )
    ).fetchone()
    if not referrals_exists:
        return
    op.drop_index("ix_candidate_referrals_referred_user_id", table_name="candidate_referrals")
    op.drop_index("ix_candidate_referrals_program_id", table_name="candidate_referrals")
    op.drop_table("candidate_referrals")
    op.drop_index("ix_candidate_referral_programs_referral_code", table_name="candidate_referral_programs")
    op.drop_index("ix_candidate_referral_programs_candidate_id", table_name="candidate_referral_programs")
    op.drop_table("candidate_referral_programs")
