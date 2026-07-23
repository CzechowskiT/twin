"""Widen connector webhook secret_hash for Fernet ciphertext."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "096_connector_secret_hash_widen"
down_revision: Union[str, None] = "095_external_connector_activation"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    if "connector_webhook_subscriptions" not in inspect(bind).get_table_names():
        return
    op.alter_column(
        "connector_webhook_subscriptions",
        "secret_hash",
        existing_type=sa.String(length=128),
        type_=sa.String(length=512),
        existing_nullable=False,
    )


def downgrade() -> None:
    bind = op.get_bind()
    if "connector_webhook_subscriptions" not in inspect(bind).get_table_names():
        return
    op.alter_column(
        "connector_webhook_subscriptions",
        "secret_hash",
        existing_type=sa.String(length=512),
        type_=sa.String(length=128),
        existing_nullable=False,
    )
