"""LinkedIn viral incentive: bonus math, UTM token referrer, claims API."""

from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import Settings
from app.core.security import create_access_token, hash_password
from app.database.models import (
    Application,
    ApplicationStatus,
    Base,
    Candidate,
    Job,
    User,
)
from app.database.session import get_db
from app.main import app
from app.services.linkedin_viral_incentive import (
    calculate_bonus_cents,
    count_attributed_signups_for_token,
    is_valid_linkedin_post_url,
)


def _sqlite_db():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, autocommit=False, autoflush=False)()


def test_calculate_bonus_cents_tiers() -> None:
    s = Settings()
    assert (
        calculate_bonus_cents(
            s,
            word_count=None,
            has_offer_letter_photo=False,
            has_video_testimonial=False,
            attributed_signup_count=0,
        )
        == s.linkedin_viral_base_tag_bonus_cents
    )
    with_story = calculate_bonus_cents(
        s,
        word_count=s.linkedin_viral_story_min_words,
        has_offer_letter_photo=True,
        has_video_testimonial=True,
        attributed_signup_count=2,
    )
    assert with_story == (
        s.linkedin_viral_base_tag_bonus_cents
        + s.linkedin_viral_story_bonus_cents
        + s.linkedin_viral_photo_bonus_cents
        + s.linkedin_viral_video_bonus_cents
        + 2 * s.linkedin_viral_per_signup_bonus_cents
    )


def test_is_valid_linkedin_post_url() -> None:
    assert is_valid_linkedin_post_url("https://www.linkedin.com/feed/update/urn:li:activity:123")
    assert is_valid_linkedin_post_url("http://LinkedIn.com/in/foo")
    assert not is_valid_linkedin_post_url("https://evil.com/linkedin.com")
    assert not is_valid_linkedin_post_url("not-a-url")


def test_register_utm_content_token_sets_referrer() -> None:
    db = _sqlite_db()
    now = datetime.now(timezone.utc)
    ref = User(
        email="viral_ref@example.com",
        hashed_password=hash_password("password12"),
        gdpr_consent_at=now,
        terms_of_service_accepted_at=now,
        job_data_processing_consent_at=now,
        ai_matching_consent_at=now,
        is_active=True,
        referral_public_token="tok123456789abcd",
    )
    db.add(ref)
    db.commit()

    def override_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_db
    try:
        client = TestClient(app)
        res = client.post(
            "/api/v1/auth/register",
            json={
                "email": "viral_new@example.com",
                "password": "password12",
                "gdpr_consent": True,
                "terms_of_service_consent": True,
                "job_data_processing_consent": True,
                "ai_matching_consent": True,
                "marketing_emails_opt_in": False,
                "referred_by_note": "someone@else.com",
                "utm_source": "linkedin",
                "utm_content": "tok123456789abcd",
            },
        )
        assert res.status_code == 201, res.text
        newbie = db.query(User).filter(User.email == "viral_new@example.com").one()
        assert newbie.signup_referrer_user_id == ref.id
        assert newbie.signup_utm_source == "linkedin"
        assert newbie.signup_utm_content == "tok123456789abcd"
        assert newbie.referral_public_token
    finally:
        app.dependency_overrides.pop(get_db, None)
        db.close()


def test_count_attributed_signups_for_token() -> None:
    db = _sqlite_db()
    now = datetime.now(timezone.utc)
    anchor = now - timedelta(days=1)
    ref = User(
        email="owner@example.com",
        hashed_password=hash_password("password12"),
        gdpr_consent_at=now,
        is_active=True,
        referral_public_token="sharetoken123456",
    )
    db.add(ref)
    db.flush()
    early = User(
        email="early@example.com",
        hashed_password=hash_password("password12"),
        gdpr_consent_at=now,
        is_active=True,
        signup_utm_content="sharetoken123456",
        created_at=anchor - timedelta(hours=1),
    )
    late = User(
        email="late@example.com",
        hashed_password=hash_password("password12"),
        gdpr_consent_at=now,
        is_active=True,
        signup_utm_content="sharetoken123456",
        created_at=anchor + timedelta(hours=1),
    )
    db.add_all([early, late])
    db.commit()

    n = count_attributed_signups_for_token(db, referral_token="sharetoken123456", since=anchor)
    assert n == 1


def test_create_claim_and_me() -> None:
    db = _sqlite_db()
    now = datetime.now(timezone.utc)
    u = User(
        email="claimant@example.com",
        hashed_password=hash_password("password12"),
        gdpr_consent_at=now,
        terms_of_service_accepted_at=now,
        job_data_processing_consent_at=now,
        ai_matching_consent_at=now,
        is_active=True,
    )
    db.add(u)
    db.flush()
    cand = Candidate(user_id=u.id, name="C", skills="[]")
    db.add(cand)
    db.flush()
    job = Job(
        job_board="x",
        external_id="e1",
        title="T",
        company="Co",
        url="https://example.com/j",
    )
    db.add(job)
    db.flush()
    hired_app = Application(
        candidate_id=cand.id,
        job_id=job.id,
        status=ApplicationStatus.HIRED,
    )
    db.add(hired_app)
    db.commit()
    db.refresh(u)

    def override_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_db
    try:
        client = TestClient(app)
        token = create_access_token(u.email)
        h = {"Authorization": f"Bearer {token}"}

        bad = client.post(
            "/api/v1/linkedin-viral/claims",
            json={
                "post_url": "https://example.com/fake",
                "submit": True,
            },
            headers=h,
        )
        assert bad.status_code == 400

        good = client.post(
            "/api/v1/linkedin-viral/claims",
            json={
                "post_url": "https://www.linkedin.com/posts/foo_bar-activity-123",
                "application_id": hired_app.id,
                "word_count": 200,
                "has_offer_letter_photo": True,
                "submit": True,
            },
            headers=h,
        )
        assert good.status_code == 201, good.text
        body = good.json()
        assert body["status"] == "submitted"
        assert body["bonus_cents_calculated"] > 0

        me = client.get("/api/v1/linkedin-viral/me", headers=h)
        assert me.status_code == 200
        m = me.json()
        assert m["referral_public_token"]
        assert len(m["claims"]) == 1
    finally:
        app.dependency_overrides.pop(get_db, None)
        db.close()
