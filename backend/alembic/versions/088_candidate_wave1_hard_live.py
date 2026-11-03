"""Candidate Wave 1 — hard LIVE evidence registry + wave1 flag seeds.

ORM: app/database/models.py (HardLiveEvidenceRecord)
Service: app/services/candidate_wave1.py
API: app/api/candidate_wave1.py
Plan: docs/FULL_PRODUCT_PRODUCTIONIZATION_PLAN.md Wave 1
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "088_candidate_wave1_hard_live"
down_revision: Union[str, None] = "087_platform_foundations_wave0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(name: str) -> bool:
    bind = op.get_bind()
    return name in inspect(bind).get_table_names()


def upgrade() -> None:
    if not _has_table("hard_live_evidence_records"):
        op.create_table(
            "hard_live_evidence_records",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("module_id", sa.String(length=128), nullable=False),
            sa.Column("persona", sa.String(length=32), nullable=False, server_default="candidate"),
            sa.Column("wave", sa.String(length=16), nullable=False, server_default="1"),
            sa.Column("status", sa.String(length=32), nullable=False, server_default="PENDING"),
            sa.Column("criteria_json", sa.Text(), nullable=False, server_default="{}"),
            sa.Column("blocker", sa.String(length=255), nullable=True),
            sa.Column("owner", sa.String(length=64), nullable=True),
            sa.Column("smoke_sha", sa.String(length=64), nullable=True),
            sa.Column("smoke_at", sa.DateTime(), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column(
                "updated_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
            sa.Column(
                "created_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("module_id", name="uq_hard_live_evidence_module"),
        )
        op.create_index("ix_hard_live_evidence_persona", "hard_live_evidence_records", ["persona"])
        op.create_index("ix_hard_live_evidence_wave", "hard_live_evidence_records", ["wave"])
        op.create_index("ix_hard_live_evidence_status", "hard_live_evidence_records", ["status"])


def downgrade() -> None:
    if _has_table("hard_live_evidence_records"):
        op.drop_index("ix_hard_live_evidence_status", table_name="hard_live_evidence_records")
        op.drop_index("ix_hard_live_evidence_wave", table_name="hard_live_evidence_records")
        op.drop_index("ix_hard_live_evidence_persona", table_name="hard_live_evidence_records")
        op.drop_table("hard_live_evidence_records")
