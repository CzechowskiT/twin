"""Investor data room upload metadata validation."""

from unittest.mock import MagicMock, patch

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.models import Base, User
from app.services import data_room_upload as dr


def test_record_upload_metadata_valid() -> None:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = Session()
    from datetime import datetime, timezone

    from app.core.security import hash_password

    now = datetime.now(timezone.utc)
    user = User(
        email="inv@example.com",
        hashed_password=hash_password("password12"),
        gdpr_consent_at=now,
        is_active=True,
    )
    db.add(user)
    db.flush()
    row = dr.record_upload_metadata(
        db,
        user_id=user.id,
        category="financials",
        filename="Q1-2026.pdf",
        content_type="application/pdf",
        size_bytes=1024,
        checksum_sha256="a" * 64,
    )
    db.commit()
    assert row.status == "validated"
    assert row.filename == "Q1-2026.pdf"


@patch("app.services.data_room_upload.get_s3_blob_store")
def test_prepare_upload_slot_metadata_only_when_s3_disabled(mock_store: MagicMock) -> None:
    mock_store.return_value.enabled = False
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = Session()
    row, url, mode = dr.prepare_upload_slot(
        db,
        user_id=1,
        category="legal",
        filename="nda.pdf",
        content_type="application/pdf",
        size_bytes=2048,
    )
    assert mode == "metadata_only"
    assert url is None
    assert row.storage_key
    db.close()


def test_validate_rejects_bad_type() -> None:
    try:
        dr.validate_upload_metadata(
            category="legal",
            filename="deck.exe",
            content_type="application/x-msdownload",
            size_bytes=100,
        )
        assert False, "expected ValueError"
    except ValueError as exc:
        assert str(exc) == "invalid_content_type"
