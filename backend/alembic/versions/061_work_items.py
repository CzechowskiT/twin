"""Work items — notes and tasks persistence (061).

ORM: app/database/models.py::WorkItem
Service: app/services/work_items.py
Design: docs/WORK_ITEMS_PERSISTENCE_2026-06-18.md
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "061_work_items"
down_revision: Union[str, None] = "060_audit_events_foundation"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.has_table(bind, "work_items"):
        return
    op.create_table(
        "work_items",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("item_type", sa.String(length=32), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="open"),
        sa.Column("due_date", sa.String(length=10), nullable=True),
        sa.Column("owner_label", sa.String(length=120), nullable=True),
        sa.Column("persona_scope", sa.String(length=32), nullable=False),
        sa.Column("company_slug", sa.String(length=80), nullable=True),
        sa.Column("created_by_user_id", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_work_items_item_type", "work_items", ["item_type"])
    op.create_index("ix_work_items_persona_scope", "work_items", ["persona_scope"])
    op.create_index("ix_work_items_company_slug", "work_items", ["company_slug"])


def downgrade() -> None:
    op.drop_index("ix_work_items_company_slug", table_name="work_items")
    op.drop_index("ix_work_items_persona_scope", table_name="work_items")
    op.drop_index("ix_work_items_item_type", table_name="work_items")
    op.drop_table("work_items")
