"""POST /api/v1/auto-apply/trigger-sweep is gated to ops allowlist only.

Before this fix any authenticated user could call `/trigger-sweep` and
enqueue the **platform-wide** nightly auto-apply sweep (every user with
active consent), exhausting the worker budget and burning third-party
submit quotas. The gate uses the existing scrape-ops allowlist
(`SCRAPE_OPS_USER_IDS` / `SCRAPE_OPS_EMAILS`) — same primitive used to
elevate scrape triggers — so we don't add a fourth admin mechanism.

These tests freeze the contract:
- unauth → 401 (FastAPI's OAuth2PasswordBearer rejects)
- auth but not on allowlist → 403
- auth + on allowlist → 200 (sweep is invoked, but mocked here)
"""

from __future__ import annotations

from collections.abc import Iterator
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import get_settings
from app.core.security import create_access_token
from app.database.models import Base, User
from app.database.session import get_db
from app.limiter import limiter
from app.main import app


def _make_session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, autocommit=False, autoflush=False)()


@pytest.fixture
def sweep_client() -> Iterator[tuple[TestClient, dict[str, str], User]]:
    db = _make_session()
    user = User(email="ops@test.com", hashed_password="x", is_active=True)
    db.add(user)
    db.commit()
    db.refresh(user)

    def override_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_db
    limiter.reset()
    token = create_access_token(user.email)
    headers = {"Authorization": f"Bearer {token}"}
    try:
        with TestClient(app) as client:
            yield client, headers, user
    finally:
        app.dependency_overrides.pop(get_db, None)
        limiter.reset()
        db.close()


def test_trigger_sweep_rejects_unauthenticated(sweep_client) -> None:
    """No JWT → FastAPI's OAuth2PasswordBearer returns 401."""
    client, _headers, _user = sweep_client
    res = client.post("/api/v1/auto-apply/trigger-sweep")
    assert res.status_code == 401


def test_trigger_sweep_rejects_non_ops_user(sweep_client, monkeypatch) -> None:
    """Authenticated but not on the ops allowlist → 403, sweep not invoked."""
    client, headers, _user = sweep_client
    monkeypatch.setenv("SCRAPE_OPS_USER_IDS", "")
    monkeypatch.setenv("SCRAPE_OPS_EMAILS", "")
    get_settings.cache_clear()

    with patch(
        "app.api.auto_apply_settings.nightly_auto_apply_sweep"
    ) as mock_sweep:
        res = client.post("/api/v1/auto-apply/trigger-sweep", headers=headers)

    assert res.status_code == 403
    body = res.json()
    assert "allowlist" in body.get("detail", "").lower() or "ops" in body.get("detail", "").lower()
    mock_sweep.assert_not_called()
    mock_sweep.delay.assert_not_called()


def test_trigger_sweep_accepts_ops_user_via_email_allowlist(
    sweep_client, monkeypatch
) -> None:
    """Authenticated AND on the allowlist → eager sweep runs and returns."""
    client, headers, user = sweep_client
    monkeypatch.setenv("SCRAPE_OPS_EMAILS", user.email)
    monkeypatch.setenv("SCRAPE_OPS_USER_IDS", "")
    monkeypatch.setenv("CELERY_TASK_ALWAYS_EAGER", "true")
    get_settings.cache_clear()

    expected = {"total_users_processed": 0, "total_applications_submitted": 0}
    with patch(
        "app.api.auto_apply_settings.nightly_auto_apply_sweep",
        return_value=expected,
    ) as mock_sweep:
        res = client.post("/api/v1/auto-apply/trigger-sweep", headers=headers)

    assert res.status_code == 200, res.text
    assert res.json() == expected
    mock_sweep.assert_called_once_with(dry_run=False)


def test_trigger_sweep_is_rate_limited(sweep_client, monkeypatch) -> None:
    """Even an ops user is held to 3/minute (defence-in-depth)."""
    client, headers, user = sweep_client
    monkeypatch.setenv("SCRAPE_OPS_EMAILS", user.email)
    monkeypatch.setenv("CELERY_TASK_ALWAYS_EAGER", "true")
    get_settings.cache_clear()

    with patch(
        "app.api.auto_apply_settings.nightly_auto_apply_sweep",
        return_value={"ok": True},
    ):
        codes = [
            client.post("/api/v1/auto-apply/trigger-sweep", headers=headers).status_code
            for _ in range(4)
        ]

    assert codes[:3] == [200, 200, 200], codes
    assert codes[3] == 429, codes


# --- hardening (long autonomous session 2026-05-27, TASK 3) --------------


def test_trigger_sweep_accepts_ops_user_via_id_allowlist(
    sweep_client, monkeypatch
) -> None:
    """ID allowlist works as an alternative to the email allowlist.

    Two-channel allowlist (`SCRAPE_OPS_USER_IDS` AND
    `SCRAPE_OPS_EMAILS`): the ID channel matters in environments
    where the email of an ops account changes (rotated to a
    +alias). Documenting the contract here so a future refactor
    cannot drop the ID-channel without breaking this test.
    """
    client, headers, user = sweep_client
    monkeypatch.setenv("SCRAPE_OPS_USER_IDS", str(user.id))
    monkeypatch.setenv("SCRAPE_OPS_EMAILS", "")
    monkeypatch.setenv("CELERY_TASK_ALWAYS_EAGER", "true")
    get_settings.cache_clear()

    expected = {"total_users_processed": 0, "total_applications_submitted": 0}
    with patch(
        "app.api.auto_apply_settings.nightly_auto_apply_sweep",
        return_value=expected,
    ) as mock_sweep:
        res = client.post("/api/v1/auto-apply/trigger-sweep", headers=headers)

    assert res.status_code == 200, res.text
    assert res.json() == expected
    mock_sweep.assert_called_once_with(dry_run=False)


def test_trigger_sweep_email_match_is_case_insensitive(
    sweep_client, monkeypatch
) -> None:
    """Email allowlist normalises case so OPS@…/ops@… both match.

    Closes a real configuration-mismatch foot-gun: env vars come
    from humans and capitalisation drift on `SCRAPE_OPS_EMAILS`
    would otherwise silently lock the operator out.
    """
    client, headers, user = sweep_client
    monkeypatch.setenv("SCRAPE_OPS_EMAILS", user.email.upper())  # ops user lower-case, env upper-case
    monkeypatch.setenv("CELERY_TASK_ALWAYS_EAGER", "true")
    get_settings.cache_clear()

    with patch(
        "app.api.auto_apply_settings.nightly_auto_apply_sweep",
        return_value={"ok": True},
    ):
        res = client.post("/api/v1/auto-apply/trigger-sweep", headers=headers)

    assert res.status_code == 200, res.text


def test_trigger_sweep_rejects_when_allowlist_unset(
    sweep_client, monkeypatch
) -> None:
    """Both env vars empty → no user is on the allowlist, always 403.

    Failure mode this catches: if the gate ever defaults to "allow"
    when nothing is configured (e.g. someone changes
    `user_has_scrape_ops` to short-circuit on empty config), every
    authenticated user could re-acquire the platform-wide sweep.
    """
    client, headers, _user = sweep_client
    monkeypatch.delenv("SCRAPE_OPS_USER_IDS", raising=False)
    monkeypatch.delenv("SCRAPE_OPS_EMAILS", raising=False)
    get_settings.cache_clear()

    with patch(
        "app.api.auto_apply_settings.nightly_auto_apply_sweep"
    ) as mock_sweep:
        res = client.post("/api/v1/auto-apply/trigger-sweep", headers=headers)

    assert res.status_code == 403, res.text
    mock_sweep.assert_not_called()
    mock_sweep.delay.assert_not_called()


def test_trigger_sweep_rejects_inactive_user(sweep_client, monkeypatch) -> None:
    """Even an allowlisted user must be active.

    The active flag is the kill-switch we'd flip on a leaked /
    compromised ops account. If `is_active=False` doesn't already
    win at the auth layer, the gate would be a privilege-
    escalation vector against the kill-switch.
    """
    client, headers, user = sweep_client
    monkeypatch.setenv("SCRAPE_OPS_EMAILS", user.email)
    monkeypatch.setenv("CELERY_TASK_ALWAYS_EAGER", "true")
    get_settings.cache_clear()

    # Flip the user off mid-session.
    db = next(iter(app.dependency_overrides[get_db]()))
    target = db.query(User).filter(User.email == user.email).first()
    assert target is not None
    target.is_active = False
    db.commit()

    with patch(
        "app.api.auto_apply_settings.nightly_auto_apply_sweep"
    ) as mock_sweep:
        res = client.post("/api/v1/auto-apply/trigger-sweep", headers=headers)

    assert res.status_code == 401, res.text
    mock_sweep.assert_not_called()
    mock_sweep.delay.assert_not_called()


def test_trigger_sweep_rejects_token_for_deleted_user(
    sweep_client, monkeypatch
) -> None:
    """A JWT signed for a now-deleted ops user is rejected at auth.

    Closes a subtle bypass: if `get_current_user` returned a
    placeholder for a missing row, every revoked operator would
    keep their privileges as long as their JWT was alive.
    """
    client, _headers, user = sweep_client
    monkeypatch.setenv("SCRAPE_OPS_EMAILS", user.email)
    monkeypatch.setenv("CELERY_TASK_ALWAYS_EAGER", "true")
    get_settings.cache_clear()

    # Mint a token whose subject does not match any User row.
    from app.core.security import create_access_token

    ghost_headers = {
        "Authorization": f"Bearer {create_access_token('does-not-exist@test.com')}"
    }

    with patch(
        "app.api.auto_apply_settings.nightly_auto_apply_sweep"
    ) as mock_sweep:
        res = client.post(
            "/api/v1/auto-apply/trigger-sweep", headers=ghost_headers
        )

    assert res.status_code == 401, res.text
    mock_sweep.assert_not_called()
    mock_sweep.delay.assert_not_called()


def test_trigger_sweep_does_not_leak_allowlist_in_403(
    sweep_client, monkeypatch
) -> None:
    """403 must not echo email/ID lists in the response body.

    The 403 surface is reachable by any signed-up user — the
    detail string must not leak allowlist contents, or a
    credential-stuffing campaign could enumerate ops accounts.
    """
    client, headers, _user = sweep_client
    monkeypatch.setenv("SCRAPE_OPS_USER_IDS", "9999")
    monkeypatch.setenv("SCRAPE_OPS_EMAILS", "secret-ops@internal.example")
    get_settings.cache_clear()

    res = client.post("/api/v1/auto-apply/trigger-sweep", headers=headers)
    assert res.status_code == 403
    body = res.json()
    detail = body.get("detail", "")
    assert "9999" not in detail
    assert "secret-ops" not in detail.lower()
    assert "internal.example" not in detail.lower()
