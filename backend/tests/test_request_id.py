"""X-Request-ID middleware."""

from fastapi.testclient import TestClient

from app.main import app


def test_health_echoes_x_request_id() -> None:
    client = TestClient(app)
    res = client.get("/api/v1/health", headers={"X-Request-ID": "unit-test-req-id-1"})
    assert res.status_code == 200
    assert res.headers.get("X-Request-ID") == "unit-test-req-id-1"


def test_health_generates_request_id_when_missing() -> None:
    client = TestClient(app)
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    rid = res.headers.get("X-Request-ID")
    assert rid and len(rid) >= 8
