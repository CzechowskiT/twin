"""Read-only public GET routes — fast regression bundle."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


@pytest.mark.parametrize(
    "path",
    [
        "/api/v1/health",
        "/api/v1/beta/stats",
        "/api/v1/billing/plans",
    ],
)
def test_public_get_returns_json_not_5xx(path: str) -> None:
    res = client.get(path)
    assert res.status_code in (200, 503), (path, res.status_code, res.text[:200])
    if res.status_code == 200:
        assert res.headers.get("content-type", "").startswith("application/json")


def test_beta_match_preview_requires_title() -> None:
    res = client.get("/api/v1/beta/match-preview")
    assert res.status_code == 422
