"""Matches CSV export."""

from fastapi.testclient import TestClient

from app.main import app


def test_matches_csv_export_unauthenticated() -> None:
    client = TestClient(app)
    res = client.get("/api/v1/candidates/me/matches/export.csv")
    assert res.status_code == 401
