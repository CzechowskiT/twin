"""Deployment startup guards — Railway runs start-api.sh before healthcheck."""

from alembic.config import Config
from alembic.script import ScriptDirectory
from fastapi.testclient import TestClient


def test_config_imports_without_optional_integrations(monkeypatch) -> None:
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.delenv("GOOGLE_CLIENT_ID", raising=False)
    from app.config import get_settings

    settings = get_settings()
    assert settings.environment


def test_app_imports() -> None:
    from app.main import app

    assert app.title


def test_alembic_has_single_head() -> None:
    cfg = Config("alembic.ini")
    script = ScriptDirectory.from_config(cfg)
    heads = script.get_heads()
    assert len(heads) == 1, f"expected one Alembic head, got {heads}"


def test_public_health_route_exists() -> None:
    from app.main import app

    paths = {getattr(r, "path", None) for r in app.routes}
    assert "/api/v1/health" in paths


def test_health_returns_ok_without_db_flag() -> None:
    from app.main import app

    client = TestClient(app)
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert body["service"] == "twin-api"


def test_alembic_recovery_module_exports() -> None:
    from scripts.alembic_prod_recovery import KNOWN_REVISIONS, recover_alembic_version

    assert "056_recruiter_application_scorecards" in KNOWN_REVISIONS
    assert callable(recover_alembic_version)
