"""Store user-owned profile documents (no parsing — vault only)."""

import re
import uuid
from pathlib import Path

from app.config import get_settings

_ALLOWED_SUFFIXES = frozenset(
    {
        ".pdf",
        ".docx",
        ".txt",
        ".png",
        ".jpg",
        ".jpeg",
        ".webp",
        ".csv",
        ".xlsx",
        ".pptx",
    }
)


def validate_profile_document_filename(filename: str) -> str:
    """Return lower-case suffix including dot, or raise ValueError."""
    if not filename or not filename.strip():
        raise ValueError("Missing filename")
    suffix = Path(filename).suffix.lower()
    if suffix not in _ALLOWED_SUFFIXES:
        raise ValueError(
            f"Unsupported file type ({suffix or 'none'}). "
            "Allowed: PDF, DOCX, TXT, PNG, JPG, WEBP, CSV, XLSX, PPTX."
        )
    return suffix


def safe_original_filename(filename: str) -> str:
    base = Path(filename).name.replace("..", "_").strip()
    if not base:
        raise ValueError("Invalid filename")
    return base[:512]


def write_profile_document_file(*, user_id: int, content: bytes, original_filename: str) -> str:
    """Write bytes to disk; return storage_path string."""
    settings = get_settings()
    validate_profile_document_filename(original_filename)
    safe_orig = safe_original_filename(original_filename)
    stem = Path(safe_orig).stem
    stem_clean = re.sub(r"[^a-zA-Z0-9._-]+", "_", stem).strip("._") or "file"
    stem_clean = stem_clean[:120]
    suffix = Path(safe_orig).suffix.lower()
    disk_name = f"{uuid.uuid4().hex}_{stem_clean}{suffix}"
    upload_dir = Path(settings.profile_documents_upload_dir) / str(user_id)
    upload_dir.mkdir(parents=True, exist_ok=True)
    dest = upload_dir / disk_name
    dest.write_bytes(content)
    return str(dest)


def read_profile_document_bytes(storage_path: str) -> bytes:
    path = Path(storage_path)
    if not path.is_file():
        raise FileNotFoundError("Stored file missing")
    return path.read_bytes()


def delete_profile_document_file(storage_path: str) -> None:
    path = Path(storage_path)
    if path.is_file():
        path.unlink(missing_ok=True)
