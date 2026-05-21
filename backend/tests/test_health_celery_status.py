"""GET /health/celery-status."""

from fastapi.testclient import TestClient

from app.main import app


def test_celery_status_endpoint() -> None:
    client = TestClient(app)
    res = client.get("/api/v1/health/celery-status")
    assert res.status_code == 200
    body = res.json()
    assert "celery_task_always_eager" in body
    assert "beat_schedule_has_nightly" in body
