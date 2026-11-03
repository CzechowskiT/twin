"""First-customer activation — feedback queue + support SLA fields.

Additive columns only; safe for existing rows.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "101_first_customer_activation"
down_revision: Union[str, None] = "100_controlled_pilot_os"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _cols(table: str) -> set[str]:
    bind = op.get_bind()
    insp = inspect(bind)
    if table not in insp.get_table_names():
        return set()
    return {c["name"] for c in insp.get_columns(table)}


def upgrade() -> None:
    fb = _cols("product_feedback")
    if "feedback_type" not in fb:
        op.add_column(
            "product_feedback",
            sa.Column(
                "feedback_type",
                sa.String(length=32),
                nullable=False,
                server_default="suggestion",
            ),
        )
    if "workflow_key" not in fb:
        op.add_column(
            "product_feedback",
            sa.Column("workflow_key", sa.String(length=64), nullable=True),
        )
    if "tags_json" not in fb:
        op.add_column(
            "product_feedback",
            sa.Column("tags_json", sa.Text(), nullable=True),
        )
    if "priority" not in fb:
        op.add_column(
            "product_feedback",
            sa.Column(
                "priority",
                sa.String(length=16),
                nullable=False,
                server_default="normal",
            ),
        )
    if "status" not in fb:
        op.add_column(
            "product_feedback",
            sa.Column(
                "status",
                sa.String(length=32),
                nullable=False,
                server_default="open",
            ),
        )
    if "assigned_to_label" not in fb:
        op.add_column(
            "product_feedback",
            sa.Column("assigned_to_label", sa.String(length=120), nullable=True),
        )
    if "resolved_at" not in fb:
        op.add_column(
            "product_feedback",
            sa.Column("resolved_at", sa.DateTime(), nullable=True),
        )

    st = _cols("pilot_support_tickets")
    if "assigned_to_label" not in st:
        op.add_column(
            "pilot_support_tickets",
            sa.Column("assigned_to_label", sa.String(length=120), nullable=True),
        )
    if "sla_hours" not in st:
        op.add_column(
            "pilot_support_tickets",
            sa.Column("sla_hours", sa.Integer(), nullable=False, server_default="24"),
        )
    if "sla_due_at" not in st:
        op.add_column(
            "pilot_support_tickets",
            sa.Column("sla_due_at", sa.DateTime(), nullable=True),
        )
    if "resolution_notes" not in st:
        op.add_column(
            "pilot_support_tickets",
            sa.Column("resolution_notes", sa.Text(), nullable=True),
        )
    if "audit_json" not in st:
        op.add_column(
            "pilot_support_tickets",
            sa.Column("audit_json", sa.Text(), nullable=True),
        )


def downgrade() -> None:
    fb = _cols("product_feedback")
    for col in (
        "resolved_at",
        "assigned_to_label",
        "status",
        "priority",
        "tags_json",
        "workflow_key",
        "feedback_type",
    ):
        if col in fb:
            op.drop_column("product_feedback", col)
    st = _cols("pilot_support_tickets")
    for col in (
        "audit_json",
        "resolution_notes",
        "sla_due_at",
        "sla_hours",
        "assigned_to_label",
    ):
        if col in st:
            op.drop_column("pilot_support_tickets", col)
