"""Alembic 050 — stripe_webhook_events migration contract (repo-only, not run on prod)."""

from __future__ import annotations

import importlib.util
from pathlib import Path

from alembic.config import Config
from alembic.script import ScriptDirectory


def _load_migration_module():
    path = Path(__file__).resolve().parents[1] / "alembic/versions/050_stripe_webhook_events.py"
    spec = importlib.util.spec_from_file_location("migration_050", path)
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(mod)
    return mod


def test_050_is_chained_after_049() -> None:
    cfg = Config("alembic.ini")
    script = ScriptDirectory.from_config(cfg)
    rev = script.get_revision("050_stripe_webhook_events")
    assert rev.down_revision == "049_job_match_feedback"


def test_050_revision_metadata_matches_design() -> None:
    mod = _load_migration_module()
    assert mod.revision == "050_stripe_webhook_events"
    assert mod.down_revision == "049_job_match_feedback"
    assert callable(mod.upgrade)
    assert callable(mod.downgrade)


def test_050_downgrade_drops_stripe_webhook_events_table() -> None:
    """Downgrade must remove the ledger table and indexes (rollback contract)."""
    mod = _load_migration_module()
    source = Path(__file__).resolve().parents[1] / "alembic/versions/050_stripe_webhook_events.py"
    text = source.read_text(encoding="utf-8")
    assert "drop_table" in text
    assert "stripe_webhook_events" in text
    assert "drop_index" in text
    assert callable(mod.downgrade)
