"""Railway start-api.sh runs `alembic upgrade head` — multiple heads block deploy."""

import importlib.util
import json
from pathlib import Path

from alembic.config import Config
from alembic.script import ScriptDirectory

from app.services.agent_dispatch.artifacts import normalize_expected


def test_alembic_has_single_head() -> None:
    cfg = Config("alembic.ini")
    script = ScriptDirectory.from_config(cfg)
    heads = script.get_heads()
    assert len(heads) == 1, f"expected one Alembic head, got {heads}"


def test_execution_contract_migration_normalizes_legacy_rows() -> None:
    path = Path("alembic/versions/082_agent_dispatch_execution_contract.py")
    spec = importlib.util.spec_from_file_location("execution_contract_migration", path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    read_only = module._normalized_contract('{"read_only": true}')
    assert read_only["execution_mode"] == "read_only"
    assert read_only["mutation_required"] is False

    raw = '{"read_only": false, "commit_required": true}'
    mutating = module._normalized_contract(raw)
    assert mutating["execution_mode"] == "mutating"
    assert mutating["operator_execution_required"] is True
    assert mutating == normalize_expected(json.loads(raw))
