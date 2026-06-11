"""Railway start-api.sh runs `alembic upgrade head` — multiple heads block deploy."""

from alembic.config import Config
from alembic.script import ScriptDirectory


def test_alembic_has_single_head() -> None:
    cfg = Config("alembic.ini")
    script = ScriptDirectory.from_config(cfg)
    heads = script.get_heads()
    assert len(heads) == 1, f"expected one Alembic head, got {heads}"
