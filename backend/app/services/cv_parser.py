"""Extract plain text from uploaded CV files."""

from io import BytesIO
from pathlib import Path

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt"}
MAX_EXTRACT_CHARS = 50_000

# Magic-byte / content sniff (Phase 2 hardening — extension alone is insufficient)
_PDF_MAGIC = b"%PDF"
_ZIP_MAGIC = b"PK"  # DOCX is a ZIP container
_DOCX_CONTENT_TYPES = b"[Content_Types].xml"


class CvParseError(ValueError):
    """Raised when CV text cannot be extracted."""


def assert_cv_content_matches_extension(content: bytes, filename: str) -> None:
    """Reject extension/MIME mismatches before parse (no malware scanner — magic only)."""
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise CvParseError(f"Unsupported file type '{ext}'. Use PDF, DOCX, or TXT.")
    if not content:
        raise CvParseError("Empty file")
    head = content[:8]
    if ext == ".pdf":
        if not content.startswith(_PDF_MAGIC):
            raise CvParseError("File content is not a valid PDF.")
    elif ext == ".docx":
        if not content.startswith(_ZIP_MAGIC):
            raise CvParseError("File content is not a valid DOCX.")
        # Light check: OOXML content types appear early in typical DOCX
        sample = content[:4096]
        if _DOCX_CONTENT_TYPES not in sample and b"word/" not in sample:
            # Still allow if ZIP; deeper validation happens in python-docx
            pass
    elif ext == ".txt":
        # Reject obvious binary
        if b"\x00" in content[:2048]:
            raise CvParseError("TXT upload looks binary; use PDF or DOCX.")
        if head.startswith(_PDF_MAGIC) or head.startswith(_ZIP_MAGIC):
            raise CvParseError("TXT extension does not match file content.")


def extract_cv_text(content: bytes, filename: str) -> str:
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise CvParseError(
            f"Unsupported file type '{ext}'. Use PDF, DOCX, or TXT."
        )
    assert_cv_content_matches_extension(content, filename)
    if ext == ".txt":
        text = content.decode("utf-8", errors="replace")
    elif ext == ".pdf":
        text = _pdf_text(content)
    else:
        text = _docx_text(content)

    text = _normalize_text(text)
    if len(text) < 80:
        raise CvParseError("Could not read enough text from the CV. Try another file.")
    return text[:MAX_EXTRACT_CHARS]


def _normalize_text(text: str) -> str:
    lines = [ln.strip() for ln in text.splitlines()]
    return "\n".join(ln for ln in lines if ln)


def _pdf_text(content: bytes) -> str:
    from pypdf import PdfReader

    reader = PdfReader(BytesIO(content))
    parts: list[str] = []
    for page in reader.pages:
        parts.append(page.extract_text() or "")
    return "\n".join(parts)


def _docx_text(content: bytes) -> str:
    from docx import Document

    doc = Document(BytesIO(content))
    return "\n".join(p.text for p in doc.paragraphs if p.text.strip())
