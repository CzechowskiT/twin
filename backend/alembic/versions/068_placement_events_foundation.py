"""Placement verification events foundation — extend placement_events for safe persistence API.

ORM: app/database/models.py::PlacementEvent (foundation columns)
Service: app/services/placement_events_foundation.py
API: app/api/placement_events.py
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "068_placement_events_foundation"
down_revision: Union[str, None] = "067_request_intake"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _column_names(table: str) -> set[str]:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    return {c["name"] for c in insp.get_columns(table)}


def upgrade() -> None:
    bind = op.get_bind()
    if not bind.dialect.has_table(bind, "placement_events"):
        op.create_table(
            "placement_events",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("application_id", sa.Integer(), nullable=True),
            sa.Column("placement_id", sa.String(length=128), nullable=True),
            sa.Column("candidate_id", sa.String(length=64), nullable=True),
            sa.Column("role_context_id", sa.String(length=64), nullable=True),
            sa.Column("company_slug", sa.String(length=80), nullable=True),
            sa.Column("event_type", sa.String(length=64), nullable=False),
            sa.Column("event_status", sa.String(length=32), nullable=True),
            sa.Column("actor", sa.String(length=32), nullable=True),
            sa.Column("actor_persona", sa.String(length=32), nullable=True),
            sa.Column("detail_json", sa.Text(), nullable=True),
            sa.Column("metadata_json", sa.Text(), nullable=True),
            sa.Column("source", sa.String(length=32), nullable=False, server_default="twin_internal"),
            sa.Column("external_side_effect", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("created_by_user_id", sa.Integer(), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
            sa.ForeignKeyConstraint(["application_id"], ["applications.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_placement_events_placement_id", "placement_events", ["placement_id"])
        op.create_index("ix_placement_events_event_type", "placement_events", ["event_type"])
        op.create_index("ix_placement_events_created_at", "placement_events", ["created_at"])
        return

    existing = _column_names("placement_events")
    additions: list[tuple[str, sa.Column]] = [
        ("placement_id", sa.Column("placement_id", sa.String(length=128), nullable=True)),
        ("candidate_id", sa.Column("candidate_id", sa.String(length=64), nullable=True)),
        ("role_context_id", sa.Column("role_context_id", sa.String(length=64), nullable=True)),
        ("company_slug", sa.Column("company_slug", sa.String(length=80), nullable=True)),
        ("event_status", sa.Column("event_status", sa.String(length=32), nullable=True)),
        ("actor_persona", sa.Column("actor_persona", sa.String(length=32), nullable=True)),
        ("metadata_json", sa.Column("metadata_json", sa.Text(), nullable=True)),
        ("source", sa.Column("source", sa.String(length=32), nullable=True, server_default="twin_internal")),
        (
            "external_side_effect",
            sa.Column("external_side_effect", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        ),
        ("created_by_user_id", sa.Column("created_by_user_id", sa.Integer(), nullable=True)),
    ]
    for name, col in additions:
        if name not in existing:
            op.add_column("placement_events", col)

    if "application_id" in existing:
        with op.batch_alter_table("placement_events") as batch:
            batch.alter_column("application_id", existing_type=sa.Integer(), nullable=True)
            if "actor" in existing:
                batch.alter_column("actor", existing_type=sa.String(length=32), nullable=True)

    if "placement_id" not in existing:
        op.create_index("ix_placement_events_placement_id", "placement_events", ["placement_id"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    if not bind.dialect.has_table(bind, "placement_events"):
        return
    existing = _column_names("placement_events")
    for name in (
        "created_by_user_id",
        "external_side_effect",
        "source",
        "metadata_json",
        "actor_persona",
        "event_status",
        "company_slug",
        "role_context_id",
        "candidate_id",
        "placement_id",
    ):
        if name in existing:
            op.drop_column("placement_events", name)
    if "ix_placement_events_placement_id" in {i["name"] for i in sa.inspect(bind).get_indexes("placement_events")}:
        op.drop_index("ix_placement_events_placement_id", table_name="placement_events")
