"""Career compass persistence API — Wave B slice 1."""

from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.deps import get_current_user
from app.database.models import Base, Candidate, CandidateCareerCompass, User
from app.database.session import get_db
from app.main import app
from app.services.candidate_career_compass_persistence import (
    career_brief_readiness_complete,
    get_compass_row,
    upsert_compass,
)
from app.services.candidate_readiness import compute_verified_candidate_gate, has_career_brief
from tests.test_auth_integration import _sqlite_session


def _seed_user(db, email: str = "compass@example.com") -> tuple[User, Candidate]:
    user = User(
        email=email,
        hashed_password="x",
        gdpr_consent_at=datetime.now(timezone.utc),
    )
    db.add(user)
    db.flush()
    cand = Candidate(user_id=user.id, name="Compass User", skills="[]", preferred_job_titles="[]")
    db.add(cand)
    db.commit()
    return user, cand


def _complete_payload(**overrides: object) -> dict:
    base = {
        "target_role": "Staff Engineer",
        "target_seniority": "senior",
        "preferred_industries": ["SaaS"],
        "preferred_locations": ["Warsaw", "Remote"],
        "work_mode": "hybrid",
        "salary_expectation_min": 20000,
        "salary_expectation_max": 28000,
        "salary_currency": "PLN",
        "career_priorities": ["Leadership", "Architecture"],
        "skill_gaps": ["Kubernetes"],
        "strengths": ["Python", "System design"],
        "next_steps": ["Update CV", "Mock interview"],
        "learning_actions": ["CKAD course"],
        "notes": "Focus on platform roles.",
    }
    base.update(overrides)
    return base


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


def test_get_empty_career_compass() -> None:
    db = _sqlite_session()
    try:
        user, _ = _seed_user(db)
        client = _client_for(db, user)
        r = client.get("/api/v1/candidates/me/career-compass")
        assert r.status_code == 200
        body = r.json()
        assert body["configured"] is False
        assert body["completion_percent"] == 0
        assert body["readiness_complete"] is False
    finally:
        app.dependency_overrides.clear()
        db.close()


def test_put_upsert_and_get_persisted() -> None:
    db = _sqlite_session()
    try:
        user, cand = _seed_user(db)
        client = _client_for(db, user)
        payload = _complete_payload()
        r_put = client.put("/api/v1/candidates/me/career-compass", json=payload)
        assert r_put.status_code == 200
        saved = r_put.json()
        assert saved["configured"] is True
        assert saved["target_role"] == "Staff Engineer"
        assert saved["readiness_complete"] is True
        assert saved["completion_percent"] > 0

        r_get = client.get("/api/v1/candidates/me/career-compass")
        assert r_get.status_code == 200
        assert r_get.json()["target_role"] == "Staff Engineer"

        rows = db.query(CandidateCareerCompass).filter(CandidateCareerCompass.candidate_id == cand.id).all()
        assert len(rows) == 1
    finally:
        app.dependency_overrides.clear()
        db.close()


def test_patch_partial_update() -> None:
    db = _sqlite_session()
    try:
        user, _ = _seed_user(db, "patch@example.com")
        client = _client_for(db, user)
        client.put("/api/v1/candidates/me/career-compass", json=_complete_payload())
        r = client.patch(
            "/api/v1/candidates/me/career-compass",
            json={"notes": "Updated notes", "next_steps": ["Ship portfolio"]},
        )
        assert r.status_code == 200
        body = r.json()
        assert body["notes"] == "Updated notes"
        assert body["next_steps"] == ["Ship portfolio"]
    finally:
        app.dependency_overrides.clear()
        db.close()


def test_salary_validation_rejects_min_gt_max() -> None:
    db = _sqlite_session()
    try:
        user, _ = _seed_user(db, "salary@example.com")
        client = _client_for(db, user)
        r = client.put(
            "/api/v1/candidates/me/career-compass",
            json=_complete_payload(salary_expectation_min=50000, salary_expectation_max=10000),
        )
        assert r.status_code == 422
    finally:
        app.dependency_overrides.clear()
        db.close()


def test_enum_validation_rejects_invalid_seniority() -> None:
    db = _sqlite_session()
    try:
        user, _ = _seed_user(db, "enum@example.com")
        client = _client_for(db, user)
        r = client.put(
            "/api/v1/candidates/me/career-compass",
            json=_complete_payload(target_seniority="super-duper"),
        )
        assert r.status_code == 422
    finally:
        app.dependency_overrides.clear()
        db.close()


def test_unauthenticated_returns_401() -> None:
    db = _sqlite_session()
    try:
        engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(engine)
        Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
        empty_db = Session()

        def override_db():
            try:
                yield empty_db
            finally:
                pass

        app.dependency_overrides[get_db] = override_db
        app.dependency_overrides.pop(get_current_user, None)
        client = TestClient(app)
        r = client.get("/api/v1/candidates/me/career-compass")
        assert r.status_code == 401
    finally:
        app.dependency_overrides.clear()
        empty_db.close()


def test_user_isolation_user_a_cannot_see_user_b() -> None:
    db = _sqlite_session()
    try:
        user_a, cand_a = _seed_user(db, "a@example.com")
        user_b, _ = _seed_user(db, "b@example.com")
        upsert_compass(db, candidate_id=cand_a.id, payload=_complete_payload(target_role="Secret Role A"))

        client_b = _client_for(db, user_b)
        r = client_b.get("/api/v1/candidates/me/career-compass")
        assert r.status_code == 200
        assert r.json()["target_role"] is None
        assert r.json()["configured"] is False
    finally:
        app.dependency_overrides.clear()
        db.close()


def test_duplicate_prevention_one_row_per_candidate() -> None:
    db = _sqlite_session()
    try:
        _, cand = _seed_user(db, "dup@example.com")
        upsert_compass(db, candidate_id=cand.id, payload=_complete_payload(target_role="First"))
        upsert_compass(db, candidate_id=cand.id, payload=_complete_payload(target_role="Second"))
        rows = db.query(CandidateCareerCompass).filter(CandidateCareerCompass.candidate_id == cand.id).all()
        assert len(rows) == 1
        assert rows[0].target_role == "Second"
    finally:
        db.close()


def test_migration_upgrade_downgrade_on_empty_db() -> None:
    db = _sqlite_session()
    try:
        bind = db.get_bind()
        assert bind is not None
        Base.metadata.create_all(bind)
        insp = inspect(bind)
        assert insp.has_table("candidate_career_compass")
        CandidateCareerCompass.__table__.drop(bind, checkfirst=True)
        insp = inspect(bind)
        assert not insp.has_table("candidate_career_compass")
    finally:
        db.close()


def test_readiness_false_when_incomplete() -> None:
    db = _sqlite_session()
    try:
        user, cand = _seed_user(db, "ready-f@example.com")
        upsert_compass(
            db,
            candidate_id=cand.id,
            payload={"target_role": "Engineer", "target_seniority": "mid"},
        )
        db.refresh(cand)
        assert has_career_brief(cand) is False
        gate = compute_verified_candidate_gate(user, cand)
        assert gate["checklist"]["career_brief_present"] is False
    finally:
        db.close()


def test_readiness_true_when_complete() -> None:
    db = _sqlite_session()
    try:
        user, cand = _seed_user(db, "ready-t@example.com")
        upsert_compass(db, candidate_id=cand.id, payload=_complete_payload())
        db.refresh(cand)
        row = get_compass_row(db, candidate_id=cand.id)
        assert career_brief_readiness_complete(row) is True
        assert has_career_brief(cand) is True
        gate = compute_verified_candidate_gate(user, cand)
        assert gate["checklist"]["career_brief_present"] is True
    finally:
        db.close()
