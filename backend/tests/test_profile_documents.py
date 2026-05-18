"""Profile documents vault (list / upload / download / delete)."""

from pathlib import Path

from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import get_settings
from app.core.deps import get_current_user
from app.database.models import Base, Candidate, User, UserProfileDocument
from app.database.session import get_db
from app.main import app


def test_profile_documents_consent_upload_list_download_delete(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("PROFILE_DOCUMENTS_UPLOAD_DIR", str(tmp_path / "vault"))
    get_settings.cache_clear()

    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = Session()
    u = User(email="docs@example.com", hashed_password="x")
    db.add(u)
    db.commit()
    db.refresh(u)

    def override_db():
        try:
            yield db
        finally:
            pass

    def _user() -> User:
        row = db.query(User).filter(User.id == u.id).first()
        assert row is not None
        return row

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = _user
    client = TestClient(app)
    try:
        r0 = client.get("/api/v1/candidates/me/documents")
        assert r0.status_code == 200
        assert r0.json()["items"] == []
        assert r0.json()["storage_consent_covered"] is False

        files = {"file": ("cert.pdf", b"%PDF-1.4\n%\n", "application/pdf")}
        r403 = client.post("/api/v1/candidates/me/documents", files=files, data={})
        assert r403.status_code == 403

        r1 = client.post(
            "/api/v1/candidates/me/documents",
            files=files,
            data={"processing_consent": "true"},
        )
        assert r1.status_code == 200
        body = r1.json()
        assert body["document"]["original_filename"] == "cert.pdf"
        doc_id = body["document"]["id"]

        u2 = db.query(User).filter(User.id == u.id).first()
        assert u2 is not None
        assert u2.profile_documents_processing_consent_at is not None

        r_list = client.get("/api/v1/candidates/me/documents")
        assert r_list.status_code == 200
        assert len(r_list.json()["items"]) == 1
        assert r_list.json()["storage_consent_covered"] is True

        r_dl = client.get(f"/api/v1/candidates/me/documents/{doc_id}/file")
        assert r_dl.status_code == 200
        assert r_dl.content.startswith(b"%PDF")

        r_del = client.delete(f"/api/v1/candidates/me/documents/{doc_id}")
        assert r_del.status_code == 204
        assert db.query(UserProfileDocument).filter(UserProfileDocument.user_id == u.id).count() == 0
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_db, None)
        db.close()


def test_profile_documents_cv_consent_covers_storage(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("PROFILE_DOCUMENTS_UPLOAD_DIR", str(tmp_path / "vault2"))
    get_settings.cache_clear()

    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = Session()
    u = User(email="docs2@example.com", hashed_password="x")
    db.add(u)
    db.commit()
    db.refresh(u)

    cand = Candidate(
        user_id=u.id,
        name="N",
        skills="[]",
        preferred_job_titles="[]",
        cv_processing_consent_at=datetime.now(timezone.utc),
    )
    db.add(cand)
    db.commit()

    def override_db():
        try:
            yield db
        finally:
            pass

    def _user() -> User:
        row = db.query(User).filter(User.id == u.id).first()
        assert row is not None
        return row

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = _user
    client = TestClient(app)
    try:
        r_list = client.get("/api/v1/candidates/me/documents")
        assert r_list.json()["storage_consent_covered"] is True

        files = {"file": ("note.txt", b"hello", "text/plain")}
        r1 = client.post("/api/v1/candidates/me/documents", files=files, data={})
        assert r1.status_code == 200
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_db, None)
        db.close()
