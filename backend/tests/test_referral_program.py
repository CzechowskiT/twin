"""Account referral program: registration edge, Stripe invoice simulation, hire bonus."""

from datetime import datetime, timezone
from unittest.mock import MagicMock

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import hash_password
from app.database.models import Base, User
from app.database.session import get_db
from app.main import app
from app.services import referral_program as rp
from app.services.referral_public_token import ensure_user_referral_public_token


def _sqlite():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, autocommit=False, autoflush=False)()


def test_register_with_ref_creates_account_referral() -> None:
    db = _sqlite()
    now = datetime.now(timezone.utc)
    ref_user = User(
        email="ref@example.com",
        hashed_password=hash_password("password12"),
        gdpr_consent_at=now,
        is_active=True,
        referral_public_token="tokREF123",
    )
    db.add(ref_user)
    db.commit()
    db.refresh(ref_user)

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
                "email": "new@example.com",
                "password": "password12",
                "gdpr_consent": True,
                "terms_of_service_consent": True,
                "job_data_processing_consent": True,
                "ai_matching_consent": True,
                "marketing_emails_opt_in": False,
                "ref": "tokREF123",
            },
        )
        assert res.status_code == 201, res.text
        newbie = db.query(User).filter(User.email == "new@example.com").one()
        assert newbie.signup_referrer_user_id == ref_user.id
        from app.database.models import AccountReferral

        row = db.query(AccountReferral).filter(AccountReferral.referred_user_id == newbie.id).one()
        assert row.referrer_user_id == ref_user.id
        assert row.ref_code_used == "tokREF123"
    finally:
        app.dependency_overrides.pop(get_db, None)
        db.close()


def test_first_subscription_invoice_grants_first_payment_payout() -> None:
    db = _sqlite()
    now = datetime.now(timezone.utc)
    ref = User(
        email="r2@example.com",
        hashed_password=hash_password("password12"),
        gdpr_consent_at=now,
        is_active=True,
    )
    child = User(
        email="c2@example.com",
        hashed_password=hash_password("password12"),
        gdpr_consent_at=now,
        is_active=True,
    )
    db.add(ref)
    db.add(child)
    db.commit()
    db.refresh(ref)
    db.refresh(child)
    ensure_user_referral_public_token(db, ref)
    db.commit()
    rp.record_account_referral_edge(
        db,
        referrer_user_id=ref.id,
        referred_user_id=child.id,
        ref_code_used=ref.referral_public_token,
        utm_source=None,
        utm_medium=None,
        utm_campaign=None,
        utm_content=None,
    )
    db.commit()

    settings = MagicMock()
    settings.referral_bonus_first_payment_cents = 1500
    settings.referral_bonus_retained_3m_cents = 2500
    settings.referral_bonus_hired_cents = 10000
    settings.referral_milestone_10_cents = 10000
    settings.referral_milestone_50_cents = 50000
    settings.referral_milestone_100_cents = 150000

    rp.on_subscription_invoice_paid(db, child, settings)
    db.commit()
    from app.database.models import ReferralPayout

    pays = db.query(ReferralPayout).filter(ReferralPayout.referrer_user_id == ref.id).all()
    assert len(pays) >= 1
    assert any(p.payout_type == rp.PAYOUT_FIRST_PAYMENT for p in pays)

    rp.on_subscription_invoice_paid(db, child, settings)
    rp.on_subscription_invoice_paid(db, child, settings)
    db.commit()
    retained = [
        p for p in db.query(ReferralPayout).filter(ReferralPayout.referrer_user_id == ref.id) if p.payout_type == rp.PAYOUT_RETAINED_3M
    ]
    assert len(retained) == 1


def test_hired_creates_hire_payout() -> None:
    db = _sqlite()
    now = datetime.now(timezone.utc)
    ref = User(
        email="r3@example.com",
        hashed_password=hash_password("password12"),
        gdpr_consent_at=now,
        is_active=True,
    )
    child = User(
        email="c3@example.com",
        hashed_password=hash_password("password12"),
        gdpr_consent_at=now,
        is_active=True,
    )
    db.add(ref)
    db.add(child)
    db.commit()
    db.refresh(ref)
    db.refresh(child)
    rp.record_account_referral_edge(
        db,
        referrer_user_id=ref.id,
        referred_user_id=child.id,
        ref_code_used=None,
        utm_source=None,
        utm_medium=None,
        utm_campaign=None,
        utm_content=None,
    )
    db.commit()
    settings = MagicMock()
    settings.referral_bonus_hired_cents = 10000
    settings.referral_milestone_10_cents = 10000
    settings.referral_milestone_50_cents = 50000
    settings.referral_milestone_100_cents = 150000
    rp.on_referred_user_hired(db, child.id, settings)
    db.commit()
    from app.database.models import ReferralPayout

    assert (
        db.query(ReferralPayout)
        .filter(
            ReferralPayout.referrer_user_id == ref.id,
            ReferralPayout.payout_type == rp.PAYOUT_HIRED,
        )
        .count()
        == 1
    )
