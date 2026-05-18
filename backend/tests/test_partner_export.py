"""Partner export route (token gate)."""

from fastapi.testclient import TestClient

from app.main import app


def test_partner_export_not_configured() -> None:
    client = TestClient(app)
    res = client.get("/api/v1/partner/exports/applications-recent.csv")
    assert res.status_code == 503


def test_partner_export_invalid_token() -> None:
    client = TestClient(app)
    res = client.get(
        "/api/v1/partner/exports/applications-recent.csv",
        headers={"X-Twin-Partner-Token": "wrong"},
    )
    assert res.status_code in (401, 503)
