"""Demo mode snapshot API — 404 when disabled."""

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import get_settings
from app.database.models import Base, Candidate, Job, User
from app.database.session import get_db
from app.main import app


def _sqlite():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, autocommit=False, autoflush=False)()


def test_demo_snapshot_404_when_disabled(monkeypatch) -> None:
    monkeypatch.setenv("DEMO_MODE_ENABLED", "false")
    get_settings.cache_clear()
    client = TestClient(app)
    res = client.get("/api/v1/demo/snapshot")
    assert res.status_code == 404
    get_settings.cache_clear()


def test_demo_snapshot_static_when_enabled_no_user(monkeypatch) -> None:
    monkeypatch.setenv("DEMO_MODE_ENABLED", "true")
    monkeypatch.setenv("DEMO_USER_EMAIL", "missing-demo@twin.app")
    get_settings.cache_clear()
    db = _sqlite()

    def override_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_db
    try:
        client = TestClient(app)
        res = client.get("/api/v1/demo/snapshot")
        assert res.status_code == 200
        body = res.json()
        assert body["source"] == "static_fallback"
        assert body["demo_mode"] is True
        assert body["sample_data"] is True
        assert "sample" in body["data_disclaimer"].lower()
        assert len(body["top_matches"]) >= 3
        assert body["scheduled_interview"]["company_name"]
        assert "email" not in res.text.lower()
    finally:
        app.dependency_overrides.pop(get_db, None)
        db.close()
        get_settings.cache_clear()


def test_demo_snapshot_demo_seed(monkeypatch) -> None:
    monkeypatch.setenv("DEMO_MODE_ENABLED", "true")
    monkeypatch.setenv("DEMO_USER_EMAIL", "demo@twin.career")
    get_settings.cache_clear()
    db = _sqlite()
    user = User(email="demo@twin.career", hashed_password="x", is_active=True)
    db.add(user)
    db.commit()
    db.refresh(user)
    cand = Candidate(
        user_id=user.id,
        name="Alex",
        skills='["python"]',
        preferred_job_titles='["dev"]',
        cv_text="CV",
    )
    db.add(cand)
    db.add(
        Job(
            job_board="pracuj",
            external_id="investor-demo-python-lead",
            title="Senior Python Developer",
            company="Nova",
            url="https://ex/1",
            is_validated=True,
        )
    )
    db.commit()

    def override_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_db
    try:
        client = TestClient(app)
        res = client.get("/api/v1/demo/snapshot")
        assert res.status_code == 200
        body = res.json()
        assert body["source"] == "demo_seed"
        assert body["sample_data"] is True
        assert body["demo_mode"] is True
        assert body["candidate"]["has_cv"] is True
        assert any(m["title"] == "Senior Python Developer" for m in body["top_matches"])
    finally:
        app.dependency_overrides.pop(get_db, None)
        db.close()
        get_settings.cache_clear()
