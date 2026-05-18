"""auto_apply_for_user respects account consents (GDPR / ToS / job data / AI matching)."""

from datetime import datetime, timezone

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import hash_password
from app.database.models import Base, Candidate, Job, User
from app.services.auto_apply_service import AutoApplyConsentBlocked, auto_apply_for_user


def _db():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, autocommit=False, autoflush=False)()


def test_auto_apply_requires_ai_matching_consent() -> None:
    db = _db()
    now = datetime.now(timezone.utc)
    u = User(
        email="a@example.com",
        hashed_password=hash_password("pw"),
        gdpr_consent_at=now,
        terms_of_service_accepted_at=now,
        job_data_processing_consent_at=now,
        ai_matching_consent_at=None,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    c = Candidate(user_id=u.id, name="A", skills='["python"]', preferred_job_titles='["dev"]', cv_text="x" * 200)
    db.add(c)
    j = Job(
        job_board="pracuj.pl",
        external_id="e1",
        title="T",
        company="C",
        url="https://ex/1",
        is_validated=True,
    )
    db.add(j)
    db.commit()
    db.refresh(j)

    with pytest.raises(AutoApplyConsentBlocked) as excinfo:
        auto_apply_for_user(db, user=u, job_id=j.id, submit=False)
    assert "zgód" in excinfo.value.detail.lower() or "zgod" in excinfo.value.detail.lower()
    db.close()
