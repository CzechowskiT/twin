import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_jurisdiction_hint_cf_header(client: TestClient):
    r = client.get(
        "/api/v1/geo/jurisdiction-hint",
        headers={"CF-IPCountry": "DE"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["country_code"] == "DE"
    assert data["legal_region"] == "EU_EEA"
    assert data["source"] == "cloudflare_header"


def test_jurisdiction_hint_disabled(monkeypatch, client: TestClient):
    from app.config import Settings, get_settings

    def fake_settings():
        s = Settings()
        s.geo_jurisdiction_lookup_enabled = False
        return s

    monkeypatch.setattr("app.api.geo.get_settings", fake_settings)
    r = client.get("/api/v1/geo/jurisdiction-hint")
    assert r.status_code == 200
    assert r.json()["source"] == "disabled"
