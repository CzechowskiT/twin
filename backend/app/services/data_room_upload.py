"""Investor data room upload metadata validation (no S3 until configured)."""

from __future__ import annotations

import hashlib
import re

from sqlalchemy.orm import Session

from app.database.models import DataRoomDocumentMetadata

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


def record_upload_metadata(
    db: Session,
    *,
    user_id: int | None,
    category: str,
    filename: str,
    content_type: str,
    size_bytes: int,
    checksum_sha256: str | None = None,
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
        status="validated",
    )
    db.add(row)
    db.flush()
    return row
