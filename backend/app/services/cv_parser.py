"""Extract plain text from uploaded CV files."""

from io import BytesIO
from pathlib import Path

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt"}
MAX_EXTRACT_CHARS = 50_000


class CvParseError(ValueError):
    """Raised when CV text cannot be extracted."""


def extract_cv_text(content: bytes, filename: str) -> str:
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise CvParseError(
            f"Unsupported file type '{ext}'. Use PDF, DOCX, or TXT."
        )
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
