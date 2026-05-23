"""Auto-apply endpoint requires authentication."""

from fastapi.testclient import TestClient

from app.main import app


def test_auto_apply_unauthenticated() -> None:
    client = TestClient(app)
    res = client.post(
        "/api/v1/applications/auto-apply",
        json={"job_id": 1, "human_acknowledged": True},
    )
    assert res.status_code == 401


def test_demo_apply_target_unauthenticated() -> None:
    client = TestClient(app)
    res = client.get("/api/v1/demo/apply-target")
    assert res.status_code == 401
