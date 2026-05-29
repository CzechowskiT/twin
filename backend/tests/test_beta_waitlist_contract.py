"""Public-surface contract tests for the beta waitlist routes.

Pairs with the existing `test_beta_waitlist_rate_limit.py` (which freezes
the SlowAPI 5/min cap on `POST /beta/join`). This file freezes the
**output contract** of the public read routes so a refactor cannot
accidentally start leaking PII into anonymous responses:

- `GET /beta/stats` returns aggregate counts + anonymised `recent`
  captions; must never include raw emails or full names.
- `GET /beta/leaderboard` masks display names (first name + last
  initial, or local-part stub) and never returns raw emails.
- `POST /beta/join` rejects requests without privacy consent with 400.
- `POST /beta/join` is idempotent on the same email — re-posting
  returns the same referral_code rather than creating a duplicate row.

Backlog 17 of the long autonomous security session. Pure fixture
tests; no DB writes outside the in-memory SQLite per test.
"""

from __future__ import annotations

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, func
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.models import Base, BetaWaitlist
from app.database.session import get_db
from app.limiter import limiter
from app.main import app


def _sqlite_session_factory() -> sessionmaker:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, autocommit=False, autoflush=False)


@pytest.fixture
def session_factory() -> sessionmaker:
    return _sqlite_session_factory()


@pytest.fixture
def client(session_factory: sessionmaker) -> Iterator[TestClient]:
    def override_db() -> Iterator:
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_db
    limiter.reset()
    try:
        with TestClient(app) as c:
            yield c
    finally:
        app.dependency_overrides.pop(get_db, None)
        limiter.reset()


def _payload(idx: int, name: str | None = None) -> dict[str, object]:
    return {
        "email": f"contract-{idx}@example.com",
        "name": name if name is not None else f"Alice Surname{idx}",
        "accept_privacy_notice": True,
        "consent_beta_email_updates": True,
        "source": "test",
        "locale": "en",
    }


# --------------------------------------------------------------------------- #
# GET /stats — anonymity contract                                              #
# --------------------------------------------------------------------------- #


def test_beta_stats_does_not_leak_raw_emails_in_recent(
    client: TestClient, session_factory: sessionmaker
) -> None:
    """`recent` is a list of opaque captions; emails must never appear there."""
    # Seed 3 signups via the API so the real anonymisation path runs.
    for i in range(3):
        client.post("/api/v1/beta/join", json=_payload(i))

    res = client.get("/api/v1/beta/stats")
    assert res.status_code == 200, res.text
    body = res.json()
    assert isinstance(body.get("recent"), list)
    blob = " ".join(str(x) for x in body["recent"])
    for i in range(3):
        assert f"contract-{i}@example.com" not in blob, blob
    # The anonymised caption format is "X. joined (..., ...)" or
    # "Someone joined (..., ...)". Both shapes are PII-free.
    for caption in body["recent"]:
        assert "@" not in caption, caption


def test_beta_stats_does_not_leak_full_names_in_recent(
    client: TestClient,
) -> None:
    """Full names from `name` are reduced to initials in `recent`."""
    client.post("/api/v1/beta/join", json=_payload(0, name="Alicja Kowalska"))
    res = client.get("/api/v1/beta/stats")
    body = res.json()
    blob = " ".join(str(x) for x in body.get("recent", []))
    assert "Alicja Kowalska" not in blob
    assert "Alicja" not in blob
    assert "Kowalska" not in blob
    # The caption should be the initials form (AK. joined ...).
    assert any("AK" in caption for caption in body["recent"])


# --------------------------------------------------------------------------- #
# GET /leaderboard — anonymity contract                                        #
# --------------------------------------------------------------------------- #


def test_beta_leaderboard_returns_empty_when_no_referrals(client: TestClient) -> None:
    """No referrals → empty leaderboard, never an error."""
    client.post("/api/v1/beta/join", json=_payload(0))
    res = client.get("/api/v1/beta/leaderboard")
    assert res.status_code == 200
    assert res.json() == {"leaderboard": []}


def test_beta_leaderboard_does_not_leak_emails(
    client: TestClient, session_factory: sessionmaker
) -> None:
    """Leaderboard entries show display name only, no emails."""
    # First user is the referrer.
    r1 = client.post(
        "/api/v1/beta/join",
        json={**_payload(0, name="Zofia Nowak"), "email": "referrer-x@example.com"},
    )
    code = r1.json()["referral_code"]
    # Second user signs up referred-by the first.
    client.post(
        "/api/v1/beta/join",
        json={
            **_payload(1, name="Karol K."),
            "email": "referee-y@example.com",
            "referred_by": code,
        },
    )
    res = client.get("/api/v1/beta/leaderboard")
    body = res.json()
    assert res.status_code == 200, body
    blob = " ".join(str(x) for x in body.get("leaderboard", []))
    assert "referrer-x@example.com" not in blob
    assert "referee-y@example.com" not in blob
    # Display name format (first + last initial) is present:
    assert any("Zofia N" in entry["display_name"] for entry in body["leaderboard"])


# --------------------------------------------------------------------------- #
# POST /join — consent + idempotency                                            #
# --------------------------------------------------------------------------- #


def test_beta_join_rejects_missing_privacy_consent(client: TestClient) -> None:
    """A 400 (not 422 / not 200) when consent flags are False."""
    payload = _payload(0)
    payload["accept_privacy_notice"] = False
    res = client.post("/api/v1/beta/join", json=payload)
    assert res.status_code == 400
    body = res.json()
    detail = body.get("detail") or ""
    assert "privacy" in detail.lower() or "consent" in detail.lower()


def test_beta_join_rejects_missing_email_consent(client: TestClient) -> None:
    """Same 400 if email-updates consent is False (both flags required)."""
    payload = _payload(0)
    payload["consent_beta_email_updates"] = False
    res = client.post("/api/v1/beta/join", json=payload)
    assert res.status_code == 400


def test_beta_join_is_idempotent_on_same_email(
    client: TestClient, session_factory: sessionmaker
) -> None:
    """Re-posting the same email returns the original referral_code.

    Critical for two reasons:
    1. Users who refresh / hit "submit" twice don't pollute the table.
    2. The rate-limited /join endpoint is a public mutation; idempotency
       limits the table-bloat blast radius even if the 5/min cap is
       bypassed (e.g. behind a load balancer).
    """
    payload = _payload(0)
    r1 = client.post("/api/v1/beta/join", json=payload)
    assert r1.status_code == 200, r1.text
    code1 = r1.json()["referral_code"]

    r2 = client.post("/api/v1/beta/join", json=payload)
    assert r2.status_code == 200
    code2 = r2.json()["referral_code"]
    assert code1 == code2

    # And exactly one row in the table.
    with session_factory() as db:
        total = int(db.query(func.count(BetaWaitlist.id)).scalar() or 0)
    assert total == 1


# --------------------------------------------------------------------------- #
# GET /match-preview — input handling                                          #
# --------------------------------------------------------------------------- #


def test_beta_match_preview_handles_short_title_safely(client: TestClient) -> None:
    """A 1-char title returns an empty match list, not a 500."""
    res = client.get("/api/v1/beta/match-preview", params={"title": "x"})
    assert res.status_code == 200, res.text
    body = res.json()
    assert body == {"title_query": "x", "matches": []}


def test_beta_match_preview_strips_whitespace_in_query_echo(client: TestClient) -> None:
    """The `title_query` echo is trimmed; protects downstream consumers."""
    res = client.get("/api/v1/beta/match-preview", params={"title": "  Developer  "})
    assert res.status_code == 200
    assert res.json()["title_query"] == "Developer"
