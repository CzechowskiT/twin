"""Email verification token flow."""

from datetime import datetime, timedelta, timezone

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import get_settings
from app.database.models import Base, EmailVerificationToken, User
from app.services.email_verification import (
    hash_verification_token,
    issue_verification_email,
    verify_email_with_token,
)


def test_verify_email_token() -> None:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = Session()
    user = User(email="verify@test.com", hashed_password="x", is_active=True)
    db.add(user)
    db.commit()
    settings = get_settings()
    issue_verification_email(db, settings, user)
    raw = "test-token-abc"
    row = db.query(EmailVerificationToken).filter(EmailVerificationToken.user_id == user.id).first()
    assert row is not None
    row.token_hash = hash_verification_token(raw)
    row.expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    db.commit()
    assert verify_email_with_token(db, raw) is True
    db.refresh(user)
    assert user.email_verified_at is not None
    db.close()
