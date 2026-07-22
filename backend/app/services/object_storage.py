"""Object storage abstraction — S3-compatible when configured, else local filesystem.

Investor data-room and DSR package delivery should use this helper.
Missing cloud credentials → status BLOCKED_EXTERNAL_CREDENTIALS (not a Founder policy hold).
"""

from __future__ import annotations

import hashlib
import logging
from pathlib import Path
from typing import Any

from app.config import get_settings
from app.services.s3_storage import S3BlobStore

logger = logging.getLogger(__name__)


def storage_backend_status() -> dict[str, Any]:
    s = get_settings()
    s3 = S3BlobStore()
    local_dir = Path(s.data_room_local_upload_dir)
    local_ok = bool(s.data_room_local_upload_enabled)
    if s3.enabled:
        return {
            "backend": "s3_compatible",
            "status": "LIVE",
            "blocker": None,
            "bucket_configured": True,
            "local_fallback": local_ok,
        }
    if local_ok:
        local_dir.mkdir(parents=True, exist_ok=True)
        return {
            "backend": "local_filesystem",
            "status": "LIVE",
            "blocker": None,
            "bucket_configured": False,
            "local_fallback": True,
            "path": str(local_dir),
        }
    return {
        "backend": "none",
        "status": "BLOCKED_EXTERNAL_CREDENTIALS",
        "blocker": "BLOCKED_EXTERNAL_CREDENTIALS",
        "bucket_configured": False,
        "local_fallback": False,
    }


def put_bytes(*, key: str, data: bytes, content_type: str = "application/octet-stream") -> dict[str, Any]:
    """Store bytes via S3 when configured; otherwise local filesystem under data_room dir."""
    s3 = S3BlobStore()
    if s3.enabled:
        stored = s3.put_bytes(key=key, data=data, content_type=content_type)
        return {"ok": bool(stored), "backend": "s3_compatible", "key": stored}
    s = get_settings()
    if not s.data_room_local_upload_enabled:
        return {
            "ok": False,
            "backend": "none",
            "blocker": "BLOCKED_EXTERNAL_CREDENTIALS",
            "key": None,
        }
    root = Path(s.data_room_local_upload_dir)
    root.mkdir(parents=True, exist_ok=True)
    safe = key.replace("..", "_").lstrip("/")
    path = root / safe
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    digest = hashlib.sha256(data).hexdigest()
    return {"ok": True, "backend": "local_filesystem", "key": str(path), "sha256": digest}
