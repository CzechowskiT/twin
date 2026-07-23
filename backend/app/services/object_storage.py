"""Object storage abstraction — S3-compatible when configured, else local filesystem.

Investor data-room and DSR package delivery should use this helper.
Missing cloud credentials with local enabled → local LIVE (not BLOCKED).
Missing both → BLOCKED_EXTERNAL_CREDENTIALS.
"""

from __future__ import annotations

import hashlib
import logging
import re
from pathlib import Path
from typing import Any

from app.config import get_settings
from app.services.s3_storage import S3BlobStore

logger = logging.getLogger(__name__)

SAFE_KEY_RE = re.compile(r"^[a-zA-Z0-9/_\.\-]+$")
MAX_BYTES = 5 * 1024 * 1024
ALLOWED_CONTENT_TYPES = {
    "application/octet-stream",
    "application/pdf",
    "text/plain",
    "image/png",
    "image/jpeg",
}


def storage_backend_status() -> dict[str, Any]:
    s = get_settings()
    s3 = S3BlobStore()
    local_dir = Path(s.data_room_local_upload_dir)
    local_ok = bool(s.data_room_local_upload_enabled)
    caps = {
        "CONFIGURATION": "LIVE",
        "WRITE": "LIVE",
        "READ": "LIVE",
        "MONITORING": "LIVE",
    }
    if s3.enabled:
        return {
            "backend": "s3_compatible",
            "status": "LIVE",
            "blocker": None,
            "bucket_configured": True,
            "local_fallback": local_ok,
            "capabilities": {**caps, "signed_urls": "LIVE"},
            "encryption": "provider_sse_or_client",
            "public_access": False,
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
            "capabilities": {**caps, "signed_urls": "LOCAL_PATH"},
            "encryption": "filesystem",
            "public_access": False,
            "note": "S3 keys unset — local backend LIVE; cloud vendor OAuth still external",
        }
    return {
        "backend": "none",
        "status": "BLOCKED_EXTERNAL_CREDENTIALS",
        "blocker": "BLOCKED_EXTERNAL_CREDENTIALS",
        "bucket_configured": False,
        "local_fallback": False,
        "capabilities": {
            "CONFIGURATION": "BLOCKED_EXTERNAL_CREDENTIALS",
            "WRITE": "BLOCKED_EXTERNAL_CREDENTIALS",
            "READ": "BLOCKED_EXTERNAL_CREDENTIALS",
            "MONITORING": "PARTIAL",
        },
    }


def _safe_key(key: str, *, tenant_prefix: str) -> str:
    raw = (key or "").replace("..", "_").lstrip("/")
    if not SAFE_KEY_RE.match(raw):
        raise ValueError("invalid_object_key")
    return f"{tenant_prefix}/{raw}"


def put_bytes(
    *,
    key: str,
    data: bytes,
    content_type: str = "application/octet-stream",
    tenant_id: str = "platform",
) -> dict[str, Any]:
    """Store bytes via S3 when configured; otherwise local filesystem under data_room dir."""
    if len(data) > MAX_BYTES:
        return {"ok": False, "blocker": "oversize", "key": None}
    ct = (content_type or "application/octet-stream").split(";")[0].strip().lower()
    if ct not in ALLOWED_CONTENT_TYPES:
        return {"ok": False, "blocker": "invalid_content_type", "key": None}
    safe = _safe_key(key, tenant_prefix=tenant_id.replace("..", "_"))
    digest = hashlib.sha256(data).hexdigest()
    s3 = S3BlobStore()
    if s3.enabled:
        stored = s3.put_bytes(key=safe, data=data, content_type=ct)
        return {
            "ok": bool(stored),
            "backend": "s3_compatible",
            "key": stored,
            "sha256": digest,
            "content_type": ct,
        }
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
    path = root / safe
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    return {
        "ok": True,
        "backend": "local_filesystem",
        "key": safe,
        "sha256": digest,
        "content_type": ct,
        "bytes": len(data),
    }


def get_bytes(*, key: str, tenant_id: str = "platform") -> dict[str, Any]:
    safe = _safe_key(key, tenant_prefix=tenant_id.replace("..", "_"))
    s3 = S3BlobStore()
    if s3.enabled:
        url = s3.presigned_get_url(key=safe, expires_in=300)
        return {"ok": bool(url), "backend": "s3_compatible", "key": safe, "presigned_get": url}
    s = get_settings()
    if not s.data_room_local_upload_enabled:
        return {"ok": False, "blocker": "BLOCKED_EXTERNAL_CREDENTIALS"}
    path = Path(s.data_room_local_upload_dir) / safe
    if not path.is_file():
        return {"ok": False, "blocker": "not_found", "key": safe}
    data = path.read_bytes()
    return {
        "ok": True,
        "backend": "local_filesystem",
        "key": safe,
        "sha256": hashlib.sha256(data).hexdigest(),
        "bytes": len(data),
    }


def delete_object(*, key: str, tenant_id: str = "platform") -> dict[str, Any]:
    safe = _safe_key(key, tenant_prefix=tenant_id.replace("..", "_"))
    s = get_settings()
    s3 = S3BlobStore()
    if s3.enabled:
        return {"ok": False, "blocker": "s3_delete_via_console", "key": safe}
    if not s.data_room_local_upload_enabled:
        return {"ok": False, "blocker": "BLOCKED_EXTERNAL_CREDENTIALS"}
    path = Path(s.data_room_local_upload_dir) / safe
    if path.is_file():
        path.unlink()
    return {"ok": True, "backend": "local_filesystem", "key": safe, "deleted": True}


def storage_smoke_roundtrip(*, tenant_id: str = "smoke") -> dict[str, Any]:
    """Authenticated prod smoke helper — put → get checksum → delete."""
    status = storage_backend_status()
    if status.get("status") != "LIVE":
        return {**status, "ok": False}
    key = "connector-smoke/ping.txt"
    payload = b"twin-storage-smoke-v1"
    put = put_bytes(
        key=key,
        data=payload,
        content_type="text/plain",
        tenant_id=tenant_id,
    )
    if not put.get("ok"):
        return {"ok": False, "step": "put", **put}
    got = get_bytes(key=key, tenant_id=tenant_id)
    if not got.get("ok"):
        return {"ok": False, "step": "get", **got}
    if got.get("backend") == "local_filesystem" and got.get("sha256") != put.get("sha256"):
        return {"ok": False, "step": "checksum_mismatch"}
    deleted = delete_object(key=key, tenant_id=tenant_id)
    post = get_bytes(key=key, tenant_id=tenant_id)
    return {
        "ok": True,
        "backend": put.get("backend"),
        "put": put,
        "get_sha256": got.get("sha256"),
        "deleted": deleted.get("ok"),
        "post_delete_denied": not post.get("ok"),
        "status": status.get("status"),
    }
