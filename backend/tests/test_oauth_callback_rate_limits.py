"""OAuth callback IP rate limits (gate S10).

Freezes 10/minute per IP on provider redirect targets so a bot loop
cannot burn Google/LinkedIn/Microsoft quota. State validation is
unchanged — these tests only assert SlowAPI returns 429 after burst.
"""

from __future__ import annotations

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from app.limiter import limiter
from app.main import app


@pytest.fixture
def oauth_client() -> Iterator[TestClient]:
    limiter.reset()
    try:
        with TestClient(app) as client:
            yield client
    finally:
        limiter.reset()


@pytest.mark.parametrize(
    "path",
    [
        "/api/v1/auth/google/callback?error=access_denied",
        "/api/v1/auth/linkedin/callback?error=access_denied",
        "/api/v1/calendar/google/callback?error=access_denied",
        "/api/v1/calendar/microsoft/callback?error=access_denied",
        "/api/v1/integrations/ats/greenhouse/callback?error=access_denied",
    ],
)
def test_oauth_callback_rate_limit_returns_429(
    oauth_client: TestClient, path: str
) -> None:
    redirect_ok = {302, 307}
    codes = [oauth_client.get(path, follow_redirects=False).status_code for _ in range(11)]
    assert sum(1 for c in codes if c in redirect_ok) == 10, codes
    assert codes[-1] == 429
