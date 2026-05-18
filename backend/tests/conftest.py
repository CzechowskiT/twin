"""Pytest defaults: reset shared SlowAPI buckets so full-suite auth tests do not share one client IP budget."""

import pytest

from app.limiter import limiter


@pytest.fixture(autouse=True)
def _reset_slowapi_limiter() -> None:
    """Each TestClient appears as the same remote address; clear limits between tests."""
    limiter.reset()
    yield
    limiter.reset()
