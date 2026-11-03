"""Celery worker identity — deploy SHA for Gate F alignment."""

from __future__ import annotations

from app.api.health import _git_commit_sha
from app.tasks.celery_app import celery_app


@celery_app.task(name="twin.worker_identity")
def worker_identity() -> dict[str, str]:
    """Return this worker process deploy SHA (no secrets)."""
    commit = _git_commit_sha() or "unknown"
    return {"git_commit": commit, "service": "twin-worker"}
