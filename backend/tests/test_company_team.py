from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import get_settings
from app.database.models import Base
from app.database.session import get_db
from app.main import app
from app.services.company_team import build_company_team_readiness
from app.services.recruiter_company_auth import mint_recruiter_company_token
from tests.test_auth_integration import _sqlite_session


@pytest.fixture
def company_api_client() -> Iterator[TestClient]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    session_local = sessionmaker(bind=engine, autocommit=False, autoflush=False)

    def override_db():
        db = session_local()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_db
    client = TestClient(app)
    yield client
    app.dependency_overrides.pop(get_db, None)


def test_build_company_team_readiness_lists_tokens_and_flags() -> None:
    db = _sqlite_session()
    get_settings.cache_clear()
    try:
        settings = get_settings()
        _, raw_a = mint_recruiter_company_token(db, company_slug="Acme Corp", label="Ops desk")
        _, raw_b = mint_recruiter_company_token(db, company_slug="Acme Corp", label="Hiring lead")
        out = build_company_team_readiness(
            db, settings, company_slug="acme-corp", raw_token=raw_a
        )
        assert out["company_slug"] == "acme-corp"
        assert out["readiness"] == {
            "invites_live": False,
            "rbac_live": False,
            "membership_model_live": False,
        }
        assert len(out["access_tokens"]) == 2
        labels = {t["label"] for t in out["access_tokens"]}
        assert labels == {"Ops desk", "Hiring lead"}
        current = [t for t in out["access_tokens"] if t["is_current_session"]]
        assert len(current) == 1
        assert current[0]["label"] == "Ops desk"
        assert out["session"]["kind"] == "company_token"
        assert out["session"]["label"] == "Ops desk"
        other = build_company_team_readiness(
            db, settings, company_slug="acme-corp", raw_token=raw_b
        )
        assert other["session"]["label"] == "Hiring lead"
    finally:
        db.close()
        get_settings.cache_clear()


def test_company_team_api_read_only(monkeypatch, company_api_client: TestClient) -> None:
    from app.database.session import get_db

    get_settings.cache_clear()
    monkeypatch.setenv("RECRUITER_INBOX_TOKEN", "global-secret")
    get_settings.cache_clear()
    try:
        db_gen = app.dependency_overrides[get_db]()
        db = next(db_gen)
        try:
            _, raw = mint_recruiter_company_token(db, company_slug="Bravo Inc", label="Pilot")
        finally:
            db_gen.close()
        res = company_api_client.get(
            "/api/v1/company/team?company_slug=bravo-inc",
            headers={"X-Twin-Recruiter-Token": raw},
        )
        assert res.status_code == 200
        body = res.json()
        assert body["readiness"]["invites_live"] is False
        assert body["access_tokens"][0]["label"] == "Pilot"
        assert body["session"]["authenticated"] is True
        assert "global-secret" not in res.text
    finally:
        get_settings.cache_clear()
