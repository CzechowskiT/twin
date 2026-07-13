"""Candidate activity timeline marker (candidate slice)."""

from typing import Sequence, Union

from alembic import op

revision: str = "077_candidate_activity_timeline"
down_revision: Union[str, None] = "076_recruiter_activity_timeline_c5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Read-only slice — projection uses existing trust audit tables; revision anchors graph head.
    pass


def downgrade() -> None:
    pass
