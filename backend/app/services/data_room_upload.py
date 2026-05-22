"""Investor data room uploads — metadata validation + optional S3 presign or local dev store."""

from __future__ import annotations

import hashlib
import re
import uuid
from pathlib import Path

from sqlalchemy.orm import Session

from app.config import get_settings
from app.database.models import DataRoomDocumentMetadata
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


def object_storage_enabled() -> bool:
    return get_s3_blob_store().enabled


def build_storage_key(*, user_id: int | None, filename: str) -> str:
    uid = user_id if user_id is not None else 0
    safe = re.sub(r"[^\w.\-]+", "_", filename.strip())[:120] or "document"
    return f"data-room/{uid}/{uuid.uuid4().hex}/{safe}"


def local_upload_root() -> Path:
    raw = (get_settings().data_room_local_upload_dir or "data/data_room_uploads").strip()
    return Path(raw)


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
    return row, None, "metadata_only"


def save_local_upload_bytes(
    *,
    storage_key: str,
    data: bytes,
    expected_size: int,
    expected_checksum: str | None = None,
) -> None:
    if len(data) < 1 or len(data) > _MAX_BYTES:
        raise ValueError("invalid_size")
    if len(data) != expected_size:
        raise ValueError("size_mismatch")
    if expected_checksum:
        digest = hashlib.sha256(data).hexdigest()
        if digest != expected_checksum.strip().lower():
            raise ValueError("checksum_mismatch")
    root = local_upload_root()
    dest = root / storage_key
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)
