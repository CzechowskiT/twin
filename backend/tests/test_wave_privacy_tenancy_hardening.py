"""Wave B/C privacy and tenancy hardening — negative security regression guards."""

from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app.core.deps import get_current_user
from app.database.models import Base, Candidate, User
from app.database.session import get_db
from app.main import app
from app.services.recruiter_talent_pool_persistence import add_talent_pool_record
from tests.test_auth_integration import _sqlite_session


def _seed_user(db, email: str) -> User:
    user = User(
        email=email,
        hashed_password="x",
        gdpr_consent_at=datetime.now(timezone.utc),
    )
    db.add(user)
    db.flush()
    db.add(
        Candidate(
            user_id=user.id,
            name="Cand",
            skills="[]",
            preferred_job_titles="[]",
        )
    )
    db.commit()
    db.refresh(user)
    return user


def _client_for(db, user: User) -> TestClient:
    def override_db():
        try:
            yield db
        finally:
            pass

    def _user() -> User:
        row = db.query(User).filter(User.id == user.id).first()
        assert row is not None
        return row

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = _user
    return TestClient(app)


def test_career_compass_cross_user_isolation() -> None:
    db = _sqlite_session()
    try:
        Base.metadata.create_all(bind=db.get_bind())
        user_a = _seed_user(db, "tenant-a@example.com")
        user_b = _seed_user(db, "tenant-b@example.com")
        payload = {
            "target_role": "Staff Engineer",
            "skill_gaps": ["System design"],
            "learning_actions": ["Architecture course"],
        }
        client_a = _client_for(db, user_a)
        assert client_a.put("/api/v1/candidates/me/career-compass", json=payload).status_code == 200
        app.dependency_overrides.clear()
        client_b = _client_for(db, user_b)
        b_data = client_b.get("/api/v1/candidates/me/career-compass").json()
        assert b_data.get("configured") is False or b_data.get("target_role") != payload["target_role"]
    finally:
        app.dependency_overrides.clear()
        db.close()


def test_recruiter_activation_forged_slug_empty_not_leak(monkeypatch) -> None:
    from app.config import get_settings

    monkeypatch.setenv("RECRUITER_INBOX_TOKEN", "test-token")
    get_settings.cache_clear()
    db = _sqlite_session()
    try:
        Base.metadata.create_all(bind=db.get_bind())

        def override_db():
            try:
                yield db
            finally:
                pass

        app.dependency_overrides[get_db] = override_db
        client = TestClient(app)
        headers = {"X-Twin-Recruiter-Token": "test-token"}
        r = client.get(
            "/api/v1/recruiter/activation",
            params={"company_slug": "forged-nonexistent-co"},
            headers=headers,
        )
        assert r.status_code == 200
        body = r.json()
        assert body.get("activation_complete") is False
        assert body.get("steps")
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()


def test_talent_pool_idor_other_company_record(monkeypatch) -> None:
    from app.config import get_settings

    monkeypatch.setenv("RECRUITER_INBOX_TOKEN", "test-token")
    get_settings.cache_clear()
    db = _sqlite_session()
    try:
        Base.metadata.create_all(bind=db.get_bind())
        out = add_talent_pool_record(
            db, company_slug="company-a", display_name="Secret Person", skills=["Go"]
        )
        rid = out["record"]["id"]

        def override_db():
            try:
                yield db
            finally:
                pass

        app.dependency_overrides[get_db] = override_db
        client = TestClient(app)
        headers = {"X-Twin-Recruiter-Token": "test-token"}
        r = client.get(
            f"/api/v1/recruiter/talent-pool/{rid}",
            params={"company_slug": "company-b"},
            headers=headers,
        )
        assert r.status_code == 404
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()


def test_recruiter_api_without_token_401(monkeypatch) -> None:
    from app.config import get_settings

    monkeypatch.setenv("RECRUITER_INBOX_TOKEN", "test-token")
    get_settings.cache_clear()
    db = _sqlite_session()
    try:
        Base.metadata.create_all(bind=db.get_bind())

        def override_db():
            try:
                yield db
            finally:
                pass

        app.dependency_overrides[get_db] = override_db
        client = TestClient(app)
        r = client.get("/api/v1/recruiter/activation", params={"company_slug": "nova-hiring-pl"})
        assert r.status_code in (401, 403)
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()


def test_referrals_endpoint_requires_auth_or_absent_on_partial_branch() -> None:
    """Route ships on #448; on tooling branch expect 401/403 or 404."""
    client = TestClient(app)
    r = client.get("/api/v1/candidates/me/referrals")
    assert r.status_code in (401, 403, 404)


def test_career_compass_put_requires_auth() -> None:
    client = TestClient(app)
    r = client.put(
        "/api/v1/candidates/me/career-compass",
        json={"target_role": "X", "skill_gaps": [], "learning_actions": []},
    )
    assert r.status_code in (401, 403)


def test_trust_center_requires_auth() -> None:
    client = TestClient(app)
    r = client.get("/api/v1/candidates/me/trust")
    assert r.status_code in (401, 403)
