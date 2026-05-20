"""Placement Celery tasks (no broker required in eager mode)."""

from unittest.mock import patch

import app.tasks.placement_tasks  # noqa: F401 — register tasks on celery_app
from app.tasks.celery_app import celery_app


def test_placement_retention_sweep_registered() -> None:
    assert "app.tasks.placement_tasks.placement_retention_sweep" in celery_app.tasks


@patch("app.tasks.placement_tasks.SessionLocal")
def test_placement_retention_sweep_returns_count(mock_session_local) -> None:
    from app.tasks.placement_tasks import placement_retention_sweep

    mock_db = mock_session_local.return_value
    mock_db.query.return_value.filter.return_value.count.return_value = 2
    celery_app.conf.task_always_eager = True
    try:
        out = placement_retention_sweep.apply().get()
        assert out == "verified_placements=2"
    finally:
        celery_app.conf.task_always_eager = False
