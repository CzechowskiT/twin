import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_jurisdiction_hint_uae(client: TestClient):
    r = client.get("/api/v1/geo/jurisdiction-hint", headers={"CF-IPCountry": "AE"})
    assert r.status_code == 200
    data = r.json()
    assert data["country_code"] == "AE"
    assert data["legal_region"] == "UAE"


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


def test_jurisdiction_hint_coords_fail_falls_back_to_cf(monkeypatch, client: TestClient):
    from app.api import geo as geo_module

    monkeypatch.setattr(geo_module, "country_from_coordinates", lambda _lat, _lon: None)
    r = client.get(
        "/api/v1/geo/jurisdiction-hint?lat=52.2297&lon=21.0122",
        headers={"CF-IPCountry": "PL"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["country_code"] == "PL"
    assert data["legal_region"] == "EU_EEA"
    assert data["source"] == "cloudflare_header"


def test_jurisdiction_hint_scientific_notation_coords(monkeypatch, client: TestClient):
    """Regression: some clients send lat/lon in scientific notation."""
    from app.api import geo as geo_module

    monkeypatch.setattr(geo_module, "country_from_coordinates", lambda _lat, _lon: None)
    r = client.get(
        "/api/v1/geo/jurisdiction-hint?lat=5.2297e1&lon=2.10122e1",
        headers={"CF-IPCountry": "DE"},
    )
    assert r.status_code == 200
    assert r.json()["country_code"] == "DE"
