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
def test_prepare_upload_slot_s3_presign(mock_store: MagicMock) -> None:
    mock_store.return_value.enabled = True
    mock_store.return_value.presigned_put_url.return_value = "https://s3.example/upload"
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
        category="financials",
        filename="deck.pdf",
        content_type="application/pdf",
        size_bytes=4096,
    )
    assert mode == "s3_presigned_put"
    assert url == "https://s3.example/upload"
    assert row.status == "pending_upload"
    db.close()


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
    assert mode == "persistent_upload_slot"
    assert url is None
    assert row.storage_key
    db.close()


def test_persistent_blob_roundtrip_download() -> None:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = Session()
    row = dr.record_upload_metadata(
        db,
        user_id=1,
        category="legal",
        filename="nda.pdf",
        content_type="application/pdf",
        size_bytes=11,
        storage_key="data-room/1/abc/nda.pdf",
    )
    payload = b"hello-world"
    digest = dr.save_persistent_upload_bytes(
        db,
        document_id=row.id,
        data=payload,
        expected_size=11,
    )
    row.status = "stored_persistent"
    db.commit()
    assert len(digest) == 64
    assert dr.document_download_available(db, row=row) is True
    body, redirect, mode = dr.read_download_payload(db, row=row)
    assert mode == "postgres_blob"
    assert redirect is None
    assert body == payload
    status = dr.storage_backend_status()
    assert status["persistent"] is True
    assert status["persistent_backend"] == "postgres_blob"
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
