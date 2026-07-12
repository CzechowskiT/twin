"""Candidate referral program persistence API — Wave B slice 3."""

from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.deps import get_current_user
from app.database.models import (
    Base,
    Candidate,
    CandidateReferral,
    CandidateReferralProgram,
    User,
)
from app.database.session import get_db
from app.main import app
from app.services.candidate_referral_persistence import (
    attach_signup_to_candidate_referral,
    build_referrals_summary,
    ensure_referral_program,
    get_program_row,
    preview_candidate_referral_code,
    record_invite,
    resolve_referrer_user_id_from_candidate_code,
)
from tests.test_auth_integration import _sqlite_session


def _seed_user(db, email: str = "referrer@example.com", name: str = "Referrer User") -> tuple[User, Candidate]:
    user = User(
        email=email,
        hashed_password="x",
        gdpr_consent_at=datetime.now(timezone.utc),
        is_active=True,
    )
    db.add(user)
    db.flush()
    cand = Candidate(user_id=user.id, name=name, skills="[]", preferred_job_titles="[]")
    db.add(cand)
    db.commit()
    return user, cand


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


def test_migration_tables_exist() -> None:
    db = _sqlite_session()
    try:
        engine = db.get_bind()
        names = inspect(engine).get_table_names()
        assert "candidate_referral_programs" in names
        assert "candidate_referrals" in names
    finally:
        db.close()


def test_get_referrals_empty_creates_program() -> None:
    db = _sqlite_session()
    try:
        user, cand = _seed_user(db)
        client = _client_for(db, user)
        r = client.get("/api/v1/candidates/me/referrals")
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["program"]["candidate_id"] == cand.id
        assert len(body["program"]["referral_code"]) >= 8
        assert body["program"]["share_path"].startswith("/register?ref=")
        assert body["pilot_labelled"] is True
        assert body["referrals"] == []
    finally:
        app.dependency_overrides.clear()
        db.close()


def test_referrals_requires_auth() -> None:
    db = _sqlite_session()
    try:
        app.dependency_overrides[get_db] = lambda: (yield db)
        app.dependency_overrides.pop(get_current_user, None)
        client = TestClient(app)
        r = client.get("/api/v1/candidates/me/referrals")
        assert r.status_code == 401
    finally:
        app.dependency_overrides.clear()
        db.close()


def test_referrals_no_profile_404() -> None:
    db = _sqlite_session()
    try:
        user = User(
            email="noprofile@example.com",
            hashed_password="x",
            gdpr_consent_at=datetime.now(timezone.utc),
        )
        db.add(user)
        db.commit()
        client = _client_for(db, user)
        r = client.get("/api/v1/candidates/me/referrals")
        assert r.status_code == 404
    finally:
        app.dependency_overrides.clear()
        db.close()


def test_ensure_code_idempotent() -> None:
    db = _sqlite_session()
    try:
        user, _ = _seed_user(db)
        client = _client_for(db, user)
        r1 = client.post("/api/v1/candidates/me/referrals/ensure-code")
        assert r1.status_code == 200, r1.text
        code1 = r1.json()["program"]["referral_code"]
        r2 = client.post("/api/v1/candidates/me/referrals/ensure-code")
        assert r2.status_code == 200
        code2 = r2.json()["program"]["referral_code"]
        assert code1 == code2
        assert r2.json()["created"] is False
    finally:
        app.dependency_overrides.clear()
        db.close()


def test_ensure_code_unique_per_candidate() -> None:
    db = _sqlite_session()
    try:
        u1, c1 = _seed_user(db, "a@example.com")
        u2, c2 = _seed_user(db, "b@example.com")
        p1, _ = ensure_referral_program(db, candidate=c1, user=u1)
        p2, _ = ensure_referral_program(db, candidate=c2, user=u2)
        db.commit()
        assert p1.referral_code != p2.referral_code
    finally:
        db.close()


def test_record_invite_creates_pending() -> None:
    db = _sqlite_session()
    try:
        user, cand = _seed_user(db)
        program, _ = ensure_referral_program(db, candidate=cand, user=user)
        db.commit()
        row = record_invite(db, program=program, invite_email="friend@example.com")
        db.commit()
        assert row["status"] == "pending"
        assert row["invite_email"] == "friend@example.com"
        assert row["referred_user_id"] is None
    finally:
        db.close()


def test_record_invite_idempotent() -> None:
    db = _sqlite_session()
    try:
        user, cand = _seed_user(db)
        program, _ = ensure_referral_program(db, candidate=cand, user=user)
        db.commit()
        r1 = record_invite(db, program=program, invite_email="friend@example.com")
        r2 = record_invite(db, program=program, invite_email="Friend@Example.com")
        assert r1["id"] == r2["id"]
    finally:
        db.close()


def test_post_invite_api() -> None:
    db = _sqlite_session()
    try:
        user, _ = _seed_user(db)
        client = _client_for(db, user)
        r = client.post(
            "/api/v1/candidates/me/referrals/invite",
            json={"invite_email": "invite@example.com"},
        )
        assert r.status_code == 201, r.text
        body = r.json()
        assert body["referral"]["invite_email"] == "invite@example.com"
        assert "no_outreach" in body["no_outreach_notice"].lower() or "does not" in body["no_outreach_notice"].lower()
    finally:
        app.dependency_overrides.clear()
        db.close()


def test_get_referral_by_id() -> None:
    db = _sqlite_session()
    try:
        user, cand = _seed_user(db)
        program, _ = ensure_referral_program(db, candidate=cand, user=user)
        db.commit()
        created = record_invite(db, program=program, invite_email="one@example.com")
        db.commit()
        client = _client_for(db, user)
        r = client.get(f"/api/v1/candidates/me/referrals/{created['id']}")
        assert r.status_code == 200
        assert r.json()["id"] == created["id"]
    finally:
        app.dependency_overrides.clear()
        db.close()


def test_get_referral_by_id_not_found() -> None:
    db = _sqlite_session()
    try:
        user, _ = _seed_user(db)
        client = _client_for(db, user)
        r = client.get("/api/v1/candidates/me/referrals/99999")
        assert r.status_code == 404
    finally:
        app.dependency_overrides.clear()
        db.close()


def test_referral_isolation_between_users() -> None:
    db = _sqlite_session()
    try:
        u1, c1 = _seed_user(db, "owner@example.com")
        u2, c2 = _seed_user(db, "other@example.com")
        p1, _ = ensure_referral_program(db, candidate=c1, user=u1)
        created = record_invite(db, program=p1, invite_email="secret@example.com")
        db.commit()
        client = _client_for(db, u2)
        r = client.get(f"/api/v1/candidates/me/referrals/{created['id']}")
        assert r.status_code == 404
        assert c2.id != c1.id
    finally:
        app.dependency_overrides.clear()
        db.close()


def test_resolve_referrer_from_candidate_code() -> None:
    db = _sqlite_session()
    try:
        user, cand = _seed_user(db)
        program, _ = ensure_referral_program(db, candidate=cand, user=user)
        db.commit()
        rid = resolve_referrer_user_id_from_candidate_code(
            db, code=program.referral_code, new_user_email="new@example.com"
        )
        assert rid == user.id
        assert (
            resolve_referrer_user_id_from_candidate_code(
                db, code=program.referral_code, new_user_email=user.email
            )
            is None
        )
    finally:
        db.close()


def test_preview_candidate_referral_code() -> None:
    db = _sqlite_session()
    try:
        user, cand = _seed_user(db, name="Alex K.")
        program, _ = ensure_referral_program(db, candidate=cand, user=user)
        db.commit()
        preview = preview_candidate_referral_code(db, code=program.referral_code)
        assert preview is not None
        assert preview["valid"] is True
        assert "Alex" in preview["display_name"]
    finally:
        db.close()


def test_public_resolve_endpoint() -> None:
    db = _sqlite_session()
    try:
        user, cand = _seed_user(db)
        program, _ = ensure_referral_program(db, candidate=cand, user=user)
        db.commit()

        def override_db():
            try:
                yield db
            finally:
                pass

        app.dependency_overrides[get_db] = override_db
        client = TestClient(app)
        r = client.get(f"/api/v1/candidates/referrals/resolve?code={program.referral_code}")
        assert r.status_code == 200, r.text
        assert r.json()["valid"] is True
    finally:
        app.dependency_overrides.clear()
        db.close()


def test_attach_signup_to_candidate_referral() -> None:
    db = _sqlite_session()
    try:
        referrer, rc = _seed_user(db, "ref@example.com")
        referred = User(
            email="joined@example.com",
            hashed_password="x",
            gdpr_consent_at=datetime.now(timezone.utc),
        )
        db.add(referred)
        db.flush()
        program, _ = ensure_referral_program(db, candidate=rc, user=referrer)
        db.commit()
        row = attach_signup_to_candidate_referral(
            db,
            referrer_user_id=referrer.id,
            referred_user_id=referred.id,
            ref_code_used=program.referral_code,
        )
        assert row is not None
        assert row.status == "signed_up"
        assert row.referred_user_id == referred.id
    finally:
        db.close()


def test_attach_signup_matches_pending_invite() -> None:
    db = _sqlite_session()
    try:
        referrer, rc = _seed_user(db, "ref2@example.com")
        referred = User(
            email="matched@example.com",
            hashed_password="x",
            gdpr_consent_at=datetime.now(timezone.utc),
        )
        db.add(referred)
        db.flush()
        program, _ = ensure_referral_program(db, candidate=rc, user=referrer)
        pending = record_invite(db, program=program, invite_email="matched@example.com")
        db.commit()
        row = attach_signup_to_candidate_referral(
            db,
            referrer_user_id=referrer.id,
            referred_user_id=referred.id,
            ref_code_used=program.referral_code,
        )
        assert row is not None
        assert row.id == pending["id"]
        assert row.status == "signed_up"
    finally:
        db.close()


def test_build_referrals_summary_counts() -> None:
    db = _sqlite_session()
    try:
        user, cand = _seed_user(db)
        program, _ = ensure_referral_program(db, candidate=cand, user=user)
        record_invite(db, program=program, invite_email="a@example.com")
        record_invite(db, program=program, invite_email="b@example.com")
        db.commit()
        summary = build_referrals_summary(db, candidate=cand, user=user)
        assert summary["program"]["pending_invites"] == 2
        assert summary["program"]["total_referrals"] == 2
    finally:
        db.close()


def test_invalid_invite_email_rejected() -> None:
    db = _sqlite_session()
    try:
        user, _ = _seed_user(db)
        client = _client_for(db, user)
        r = client.post(
            "/api/v1/candidates/me/referrals/invite",
            json={"invite_email": "not-an-email"},
        )
        assert r.status_code == 422
    finally:
        app.dependency_overrides.clear()
        db.close()
