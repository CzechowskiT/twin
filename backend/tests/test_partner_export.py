"""Partner export route (token gate)."""

import csv
from io import StringIO

import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.database.session import get_db
from app.main import create_app
from app.services.partner_auth import mint_partner_api_key
from tests.test_auth_integration import _sqlite_session


def _reload_settings(monkeypatch: pytest.MonkeyPatch, **env: str) -> None:
    for key, value in env.items():
        monkeypatch.setenv(key, value)
    get_settings.cache_clear()


def _client_with_db(db) -> TestClient:
    app = create_app()

    def override_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_db
    return TestClient(app), app


def test_partner_export_not_configured(monkeypatch: pytest.MonkeyPatch) -> None:
    _reload_settings(monkeypatch, PARTNER_EXPORT_TOKEN="")
    db = _sqlite_session()
    client, app = _client_with_db(db)
    try:
        res = client.get("/api/v1/partner/exports/applications-recent.csv")
        assert res.status_code == 503
    finally:
        app.dependency_overrides.pop(get_db, None)
        db.close()


def test_partner_export_invalid_token(monkeypatch: pytest.MonkeyPatch) -> None:
    _reload_settings(monkeypatch, PARTNER_EXPORT_TOKEN="legacy-secret")
    db = _sqlite_session()
    client, app = _client_with_db(db)
    try:
        res = client.get(
            "/api/v1/partner/exports/applications-recent.csv",
            headers={"X-Twin-Partner-Token": "wrong"},
        )
        assert res.status_code == 401
    finally:
        app.dependency_overrides.pop(get_db, None)
        db.close()


def test_partner_export_legacy_token_csv(monkeypatch: pytest.MonkeyPatch) -> None:
    _reload_settings(monkeypatch, PARTNER_EXPORT_TOKEN="legacy-secret")
    db = _sqlite_session()
    client, app = _client_with_db(db)
    try:
        res = client.get(
            "/api/v1/partner/exports/applications-recent.csv?limit=5",
            headers={"X-Twin-Partner-Token": "legacy-secret"},
        )
        assert res.status_code == 200
        assert "text/csv" in res.headers.get("content-type", "")
        rows = list(csv.reader(StringIO(res.text)))
        assert rows[0][0] == "application_id"
        assert "candidate_id" in rows[0]
    finally:
        app.dependency_overrides.pop(get_db, None)
        db.close()


def test_partner_export_db_key_csv(monkeypatch: pytest.MonkeyPatch) -> None:
    _reload_settings(monkeypatch, PARTNER_EXPORT_TOKEN="")
    db = _sqlite_session()
    client, app = _client_with_db(db)
    try:
        _, raw = mint_partner_api_key(db, label="export-test")
        res = client.get(
            "/api/v1/partner/exports/applications-recent.csv",
            headers={"X-Twin-Partner-Token": raw},
        )
        assert res.status_code == 200
        assert res.headers.get("content-disposition", "").startswith("attachment")
    finally:
        app.dependency_overrides.pop(get_db, None)
        db.close()
