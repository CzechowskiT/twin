"""Investor data room uploads — metadata + persistent Postgres blob or optional S3."""

from __future__ import annotations

import hashlib
import re
import uuid
from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session

from app.config import get_settings
from app.database.models import DataRoomDocumentBlob, DataRoomDocumentMetadata
from app.services.s3_storage import get_s3_blob_store

_ALLOWED_CATEGORIES = frozenset({"cap_table", "financials", "legal", "other"})
_ALLOWED_TYPES = frozenset(
    {
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
        "text/csv",
    }
)
_MAX_BYTES = 25 * 1024 * 1024
_FILENAME_RE = re.compile(r"^[\w.\- ]{1,200}$", re.UNICODE)
_PRESIGN_TTL_SEC = 3600
_STORED_STATUSES = frozenset({"stored", "validated", "stored_local", "stored_persistent"})


def validate_upload_metadata(
    *,
    category: str,
    filename: str,
    content_type: str,
    size_bytes: int,
    checksum_sha256: str | None = None,
) -> None:
    cat = category.strip().lower()
    if cat not in _ALLOWED_CATEGORIES:
        raise ValueError("invalid_category")
    name = filename.strip()
    if not name or not _FILENAME_RE.match(name):
        raise ValueError("invalid_filename")
    ct = content_type.strip().lower()
    if ct not in _ALLOWED_TYPES:
        raise ValueError("invalid_content_type")
    if size_bytes < 1 or size_bytes > _MAX_BYTES:
        raise ValueError("invalid_size")
    if checksum_sha256:
        digest = checksum_sha256.strip().lower()
        if len(digest) != 64 or not all(c in "0123456789abcdef" for c in digest):
            raise ValueError("invalid_checksum")


def object_storage_configured() -> bool:
    """True when S3 env vars are set (no network I/O — safe for hot public endpoints)."""
    s = get_settings()
    return bool(
        (s.s3_access_key_id or "").strip()
        and (s.s3_secret_access_key or "").strip()
        and (s.s3_bucket_name or "").strip()
    )


def object_storage_enabled() -> bool:
    return get_s3_blob_store().enabled


def build_storage_key(*, user_id: int | None, filename: str) -> str:
    uid = user_id if user_id is not None else 0
    safe = re.sub(r"[^\w.\-]+", "_", filename.strip())[:120] or "document"
    return f"data-room/{uid}/{uuid.uuid4().hex}/{safe}"


def local_upload_root() -> Path:
    raw = (get_settings().data_room_local_upload_dir or "data/data_room_uploads").strip()
    return Path(raw)


def storage_backend_status() -> dict[str, Any]:
    """Honest CORE secure-download backend — Postgres primary, S3 optional."""
    s3 = object_storage_configured()
    return {
        "persistent_backend": "postgres_blob",
        "persistent": True,
        "s3_optional": s3,
        "ephemeral_local_mirror_only": True,
        "core_download_path": "GET /api/v1/investor/data-room/documents/{id}/download",
    }


def record_upload_metadata(
    db: Session,
    *,
    user_id: int | None,
    category: str,
    filename: str,
    content_type: str,
    size_bytes: int,
    checksum_sha256: str | None = None,
    storage_key: str | None = None,
    status: str = "validated",
) -> DataRoomDocumentMetadata:
    validate_upload_metadata(
        category=category,
        filename=filename,
        content_type=content_type,
        size_bytes=size_bytes,
        checksum_sha256=checksum_sha256,
    )
    row = DataRoomDocumentMetadata(
        user_id=user_id,
        category=category.strip().lower(),
        filename=filename.strip(),
        content_type=content_type.strip().lower(),
        size_bytes=size_bytes,
        checksum_sha256=(checksum_sha256 or "").strip().lower() or None,
        storage_key=storage_key,
        status=status,
    )
    db.add(row)
    db.flush()
    return row


def prepare_upload_slot(
    db: Session,
    *,
    user_id: int | None,
    category: str,
    filename: str,
    content_type: str,
    size_bytes: int,
    checksum_sha256: str | None = None,
) -> tuple[DataRoomDocumentMetadata, str | None, str]:
    """Create metadata row; return (row, presigned_put_url or None, storage_mode)."""
    store = get_s3_blob_store()
    key = build_storage_key(user_id=user_id, filename=filename)
    if store.enabled:
        row = record_upload_metadata(
            db,
            user_id=user_id,
            category=category,
            filename=filename,
            content_type=content_type,
            size_bytes=size_bytes,
            checksum_sha256=checksum_sha256,
            storage_key=key,
            status="pending_upload",
        )
        url = store.presigned_put_url(
            key=key, content_type=content_type.strip().lower(), expires_in=_PRESIGN_TTL_SEC
        )
        if not url:
            raise ValueError("presign_failed")
        return row, url, "s3_presigned_put"
    row = record_upload_metadata(
        db,
        user_id=user_id,
        category=category,
        filename=filename,
        content_type=content_type,
        size_bytes=size_bytes,
        checksum_sha256=checksum_sha256,
        storage_key=key,
        status="validated",
    )
    return row, None, "persistent_upload_slot"


def _validate_bytes(
    data: bytes,
    *,
    expected_size: int,
    expected_checksum: str | None = None,
) -> str:
    if len(data) < 1 or len(data) > _MAX_BYTES:
        raise ValueError("invalid_size")
    if len(data) != expected_size:
        raise ValueError("size_mismatch")
    digest = hashlib.sha256(data).hexdigest()
    if expected_checksum and digest != expected_checksum.strip().lower():
        raise ValueError("checksum_mismatch")
    return digest


def save_persistent_upload_bytes(
    db: Session,
    *,
    document_id: int,
    data: bytes,
    expected_size: int,
    expected_checksum: str | None = None,
) -> str:
    """Store bytes in Postgres (persistent, multi-replica safe). Returns sha256."""
    digest = _validate_bytes(data, expected_size=expected_size, expected_checksum=expected_checksum)
    existing = db.query(DataRoomDocumentBlob).filter(DataRoomDocumentBlob.document_id == document_id).one_or_none()
    if existing:
        existing.content = data
        existing.checksum_sha256 = digest
        existing.size_bytes = len(data)
    else:
        db.add(
            DataRoomDocumentBlob(
                document_id=document_id,
                content=data,
                checksum_sha256=digest,
                size_bytes=len(data),
            )
        )
    db.flush()
    # Best-effort local mirror (not the durable source of truth).
    try:
        meta = db.query(DataRoomDocumentMetadata).filter(DataRoomDocumentMetadata.id == document_id).one_or_none()
        if meta and meta.storage_key:
            save_local_upload_bytes(
                storage_key=meta.storage_key,
                data=data,
                expected_size=expected_size,
                expected_checksum=digest,
            )
    except OSError:
        pass
    return digest


def save_local_upload_bytes(
    *,
    storage_key: str,
    data: bytes,
    expected_size: int,
    expected_checksum: str | None = None,
) -> None:
    _validate_bytes(data, expected_size=expected_size, expected_checksum=expected_checksum)
    root = local_upload_root()
    dest = root / storage_key
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)


def has_persistent_blob(db: Session, *, document_id: int) -> bool:
    return (
        db.query(DataRoomDocumentBlob.document_id)
        .filter(DataRoomDocumentBlob.document_id == document_id)
        .first()
        is not None
    )


def read_download_payload(
    db: Session,
    *,
    row: DataRoomDocumentMetadata,
) -> tuple[bytes | None, str | None, str]:
    """Return (bytes, redirect_url, mode) for authenticated download.

    Modes: postgres_blob | s3_presigned_get | missing
    """
    blob = (
        db.query(DataRoomDocumentBlob)
        .filter(DataRoomDocumentBlob.document_id == row.id)
        .one_or_none()
    )
    if blob and blob.content:
        return bytes(blob.content), None, "postgres_blob"
    if row.storage_key and object_storage_enabled():
        url = get_s3_blob_store().presigned_get_url(key=row.storage_key, expires_in=_PRESIGN_TTL_SEC)
        if url:
            return None, url, "s3_presigned_get"
    if row.storage_key:
        path = local_upload_root() / row.storage_key
        if path.is_file():
            return path.read_bytes(), None, "local_mirror_fallback"
    return None, None, "missing"


def document_download_available(db: Session, *, row: DataRoomDocumentMetadata) -> bool:
    if row.status not in _STORED_STATUSES and row.status != "pending_upload":
        # pending_upload only downloadable after S3 put + confirm — treat as unavailable until stored
        pass
    if has_persistent_blob(db, document_id=row.id):
        return True
    if row.status in {"stored", "validated", "stored_local", "stored_persistent"} and row.storage_key:
        if object_storage_configured():
            return True
        path = local_upload_root() / row.storage_key
        if path.is_file():
            return True
    return has_persistent_blob(db, document_id=row.id)
