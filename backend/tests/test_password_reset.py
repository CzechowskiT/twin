"""Password reset helpers and routes."""

from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from app.main import app
from app.services.password_reset import FORGOT_PASSWORD_ACK, hash_reset_token, request_password_reset


def test_hash_reset_token_is_hex_digest() -> None:
    h = hash_reset_token("plain-token")
    assert len(h) == 64
    assert h == hash_reset_token("plain-token")
    assert h != hash_reset_token("other-token")


@patch("app.services.password_reset.send_password_reset_email")
def test_request_reset_no_user_returns_ack(mock_send: MagicMock) -> None:
    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = None
    settings = MagicMock()
    settings.password_reset_token_ttl_minutes = 60
    settings.frontend_url = "http://localhost:3000"
    settings.environment = "development"
    settings.debug = False

    msg = request_password_reset(db, settings, "nobody@example.com")
    assert msg == FORGOT_PASSWORD_ACK
    db.add.assert_not_called()
    db.commit.assert_not_called()
    mock_send.assert_not_called()


@patch("app.services.password_reset.send_password_reset_email")
def test_request_reset_linkedin_only_user_returns_ack(mock_send: MagicMock) -> None:
    user = MagicMock()
    user.hashed_password = None
    user.is_active = True
    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = user
    settings = MagicMock()
    settings.password_reset_token_ttl_minutes = 60
    settings.frontend_url = "http://localhost:3000"
    settings.environment = "development"
    settings.debug = False

    msg = request_password_reset(db, settings, "li@example.com")
    assert msg == FORGOT_PASSWORD_ACK
    db.add.assert_not_called()
    mock_send.assert_not_called()


@patch("app.services.password_reset.is_mail_configured", return_value=True)
@patch("app.services.password_reset.send_password_reset_email")
def test_request_reset_creates_token_and_sends_mail(mock_send: MagicMock, _mc: MagicMock) -> None:
    user = MagicMock()
    user.id = 7
    user.email = "u@example.com"
    user.hashed_password = "bcrypt-here"
    user.is_active = True
    user.exclude_from_product_metrics = False

    token_q = MagicMock()
    token_q.filter.return_value = token_q
    token_q.update.return_value = 0

    user_q = MagicMock()
    user_q.filter.return_value = user_q
    user_q.first.return_value = user

    db = MagicMock()

    def query_side_effect(model):
        name = getattr(model, "__name__", "")
        if name == "User":
            return user_q
        if name == "PasswordResetToken":
            return token_q
        raise AssertionError(model)

    db.query.side_effect = query_side_effect

    settings = MagicMock()
    settings.password_reset_token_ttl_minutes = 60
    settings.frontend_url = "http://localhost:3000"
    settings.environment = "development"
    settings.debug = False

    with patch("app.services.password_reset.get_settings") as gs:
        gs.return_value = MagicMock(
            auth_recovery_v2_enabled=True,
            auth_recovery_v2_session_revoke=True,
            auth_recovery_v2_hash_links=True,
            auth_legacy_reset_token_acceptance=True,
        )
        msg = request_password_reset(db, settings, "U@Example.com")
    assert msg == FORGOT_PASSWORD_ACK
    assert db.add.call_count >= 1
    assert db.commit.call_count >= 1
    mock_send.assert_called_once()
    args, kwargs = mock_send.call_args
    reset_url = kwargs.get("reset_url") or (args[2] if len(args) > 2 else "")
    assert "#token=" in str(reset_url)


def test_forgot_password_route_does_not_require_real_db() -> None:
    from app.database.session import get_db
    from app.services.login_rate_limit import reset_login_rate_limit_state

    mock_session = MagicMock()
    reset_login_rate_limit_state()

    def _override_db():
        yield mock_session

    app.dependency_overrides[get_db] = _override_db
    try:
        with patch("app.api.auth.request_password_reset", return_value="stub message") as m:
            client = TestClient(app)
            res = client.post("/api/v1/auth/forgot-password", json={"email": "a@b.com"})
        assert res.status_code == 200
        assert res.json() == {"message": "stub message"}
        m.assert_called_once()
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_reset_password_short_password_validation() -> None:
    client = TestClient(app)
    res = client.post(
        "/api/v1/auth/reset-password",
        json={"token": "x", "password": "short"},
    )
    assert res.status_code == 422
