"""Google Calendar API routes (no live Google calls)."""

from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_token_crypto_roundtrip() -> None:
    from app.services.token_crypto import decrypt_secret, encrypt_secret

    s = "refresh-token-test"
    assert decrypt_secret(encrypt_secret(s)) == s


def test_calendar_authorize_unauthenticated(client: TestClient) -> None:
    res = client.get("/api/v1/calendar/google/authorize")
    assert res.status_code == 401


def test_interview_ics_unauthenticated(client: TestClient) -> None:
    res = client.get("/api/v1/calendar/interviews/1/ics")
    assert res.status_code == 401


@patch("app.api.calendar.is_google_calendar_oauth_configured", return_value=False)
def test_calendar_authorize_not_configured(_mock: MagicMock, client: TestClient) -> None:
    from app.core.deps import get_current_user
    from app.database.models import User

    def _user() -> User:
        u = User(email="x@y.com", hashed_password=None)
        u.id = 1
        return u

    app.dependency_overrides[get_current_user] = _user
    try:
        res = client.get("/api/v1/calendar/google/authorize")
        assert res.status_code == 503
    finally:
        app.dependency_overrides.pop(get_current_user, None)


@patch("app.api.calendar.get_settings")
def test_calendar_callback_invalid_state(mock_settings: MagicMock, client: TestClient) -> None:
    mock_settings.return_value.frontend_url = "http://localhost:3000"
    res = client.get("/api/v1/calendar/google/callback?code=abc&state=bad", follow_redirects=False)
    assert res.status_code == 302
    assert res.headers["location"].startswith("http://localhost:3000/dashboard/calendar?")
    assert "calendar_error=invalid_state" in res.headers["location"]
