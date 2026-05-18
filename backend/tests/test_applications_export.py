"""Applications CSV export route."""

from fastapi.testclient import TestClient

from app.main import app


def test_applications_csv_export_unauthenticated() -> None:
    client = TestClient(app)
    res = client.get("/api/v1/applications/me/export.csv")
    assert res.status_code == 401
