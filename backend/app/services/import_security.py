"""Epic 2.12 — Fail-closed upload validation (magic bytes, bounds, no ZIP/XLSX)."""

from __future__ import annotations

import re
from pathlib import PurePosixPath

from app.services.candidate_owned_import_constants import (
    ALLOWED_EXT,
    MAX_UPLOAD_BYTES,
)

_PDF = b"%PDF"
_ZIP = b"PK"  # DOCX container only when family=document + .docx
_NULL = b"\x00"


class ImportSecurityError(ValueError):
    """Fail-closed validation error — safe reason codes only."""


def sanitize_declared_name(name: str | None) -> str:
    """Never trust client filename — return opaque safe label for UI only."""
    raw = (name or "upload").strip()
    base = PurePosixPath(raw.replace("\\", "/")).name
    base = re.sub(r"[^a-zA-Z0-9._-]+", "_", base)[:80]
    return base or "upload"


def declared_extension(name: str | None) -> str:
    base = sanitize_declared_name(name)
    if "." not in base:
        return ""
    return "." + base.rsplit(".", 1)[-1].lower()


def validate_upload(*, family: str, content: bytes, declared_name: str | None) -> str:
    """Return normalized extension. Raises ImportSecurityError on any mismatch."""
    if family not in ALLOWED_EXT:
        raise ImportSecurityError("unsupported_family")
    if not content:
        raise ImportSecurityError("empty_upload")
    if len(content) > MAX_UPLOAD_BYTES:
        raise ImportSecurityError("upload_too_large")
    ext = declared_extension(declared_name)
    allowed = ALLOWED_EXT[family]
    if ext not in allowed:
        raise ImportSecurityError("extension_not_allowed")

    head = content[:16]
    if family == "document":
        if ext == ".pdf":
            if not content.startswith(_PDF):
                raise ImportSecurityError("magic_mismatch_pdf")
        elif ext == ".docx":
            if not content.startswith(_ZIP):
                raise ImportSecurityError("magic_mismatch_docx")
            # Reject polyglot / nested archive abuse: no absolute paths in local headers sample
            sample = content[:8192]
            if b"../" in sample or b"..\\" in sample:
                raise ImportSecurityError("docx_path_traversal")
        elif ext in {".txt", ".md"}:
            if _NULL in content[:4096]:
                raise ImportSecurityError("text_looks_binary")
            if head.startswith(_PDF) or head.startswith(_ZIP):
                raise ImportSecurityError("magic_mismatch_text")
    elif family in {"tracker", "twin_export", "linkedin_export"}:
        if ext == ".json":
            stripped = content.lstrip()
            if not stripped.startswith((b"{", b"[")):
                raise ImportSecurityError("json_magic_mismatch")
            if _NULL in content[:4096]:
                raise ImportSecurityError("json_binary")
        elif ext == ".csv":
            if _NULL in content[:4096]:
                raise ImportSecurityError("csv_binary")
            if head.startswith(_PDF) or head.startswith(_ZIP):
                raise ImportSecurityError("csv_magic_mismatch")
    # Explicit bans
    if ext in {".zip", ".xlsx", ".xls", ".exe", ".js", ".html"}:
        raise ImportSecurityError("format_banned")
    return ext


def reject_generic_zip(content: bytes, ext: str) -> None:
    if ext == ".zip" or (content.startswith(_ZIP) and ext not in {".docx"}):
        raise ImportSecurityError("generic_zip_banned")
