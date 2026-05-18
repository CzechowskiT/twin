"""Optional free-text note on self-declared placement intent."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "022_placement_declaration_note"
down_revision: Union[str, None] = "021_placement_events"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("applications", sa.Column("placement_declaration_note", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("applications", "placement_declaration_note")
