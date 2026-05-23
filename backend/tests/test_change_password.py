"""Authenticated password change."""

from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from app.core.deps import get_current_user
from app.database.session import get_db
from app.main import app
from app.services.password_change import PasswordChangeError, change_user_password


def test_change_user_password_wrong_current() -> None:
    user = MagicMock()
    user.hashed_password = "bcrypt-hash"
    user.id = 1
    db = MagicMock()

    with patch("app.services.password_change.verify_password", return_value=False):
        try:
            change_user_password(db, user, current_password="old", new_password="newpassword1")
            raise AssertionError("expected PasswordChangeError")
        except PasswordChangeError as exc:
            assert exc.code == "invalid_current_password"


@patch("app.services.password_change.hash_password", return_value="new-hash")
@patch("app.services.password_change.verify_password", return_value=True)
def test_change_user_password_success(_verify: MagicMock, _hash: MagicMock) -> None:
    user = MagicMock()
    user.hashed_password = "bcrypt-hash"
    user.id = 3
    db = MagicMock()
    token_q = MagicMock()
    token_q.filter.return_value = token_q
    db.query.return_value = token_q

    change_user_password(db, user, current_password="oldpass12", new_password="newpass12")

    assert user.hashed_password == "new-hash"
    token_q.delete.assert_called_once()
    db.add.assert_called_once_with(user)
    db.commit.assert_called_once()


def test_change_password_route_requires_auth() -> None:
    client = TestClient(app)
    res = client.patch(
        "/api/v1/auth/me/password",
        json={"current_password": "oldpass12", "new_password": "newpass12"},
    )
    assert res.status_code == 401


def test_change_password_route_maps_invalid_current() -> None:
    user = MagicMock()
    user.hashed_password = "bcrypt-hash"
    mock_session = MagicMock()

    def _override_db():
        yield mock_session

    app.dependency_overrides[get_db] = _override_db
    app.dependency_overrides[get_current_user] = lambda: user
    try:
        with patch(
            "app.api.auth.change_user_password",
            side_effect=PasswordChangeError("invalid_current_password"),
        ):
            client = TestClient(app)
            res = client.patch(
                "/api/v1/auth/me/password",
                json={"current_password": "wrong", "new_password": "newpass12"},
            )
        assert res.status_code == 400
        assert res.json()["detail"] == "Current password is incorrect."
    finally:
        app.dependency_overrides.pop(get_db, None)
        app.dependency_overrides.pop(get_current_user, None)


def test_change_password_short_new_password_validation() -> None:
    user = MagicMock()
    user.hashed_password = "bcrypt-hash"
    app.dependency_overrides[get_current_user] = lambda: user
    try:
        client = TestClient(app)
        res = client.patch(
            "/api/v1/auth/me/password",
            json={"current_password": "oldpass12", "new_password": "short"},
        )
        assert res.status_code == 422
    finally:
        app.dependency_overrides.pop(get_current_user, None)
