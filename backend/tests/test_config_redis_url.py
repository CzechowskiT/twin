"""Redis URL sanitization for Railway template typos."""

from app.config import Settings


def test_celery_broker_strips_trailing_braces(monkeypatch) -> None:
    monkeypatch.setenv("CELERY_BROKER_URL", "redis://redis.railway.internal:6379}}")
    monkeypatch.setenv("CELERY_RESULT_BACKEND", "redis://redis.railway.internal:6379/0}}")
    monkeypatch.setenv("REDIS_URL", "redis://redis.railway.internal:6379")
    s = Settings()
    assert s.celery_broker_url.endswith(":6379")
    assert "}}" not in s.celery_broker_url
    assert "}}" not in s.celery_result_backend
