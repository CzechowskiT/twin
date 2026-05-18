"""Single PDF for auto-apply: tailored pitch, legal-style consent, verbatim CV appendix."""

from __future__ import annotations

import re
from pathlib import Path
from typing import Iterable

from fpdf import FPDF

_BACKEND_ROOT = Path(__file__).resolve().parent.parent.parent
_DEFAULT_FONT = _BACKEND_ROOT / "assets" / "fonts" / "NotoSans-Regular.ttf"
_MAX_CV_APPEND_CHARS = 45_000


def default_consent_paragraphs_pl() -> tuple[str, ...]:
    """Recruitment consent + truthfulness; not legal advice — ops may extend via settings."""
    return (
        "Wyrażam zgodę na przetwarzanie moich danych osobowych zawartych w niniejszej aplikacji "
        "oraz w załączonym życiorysie w celu prowadzenia rekrutacji na stanowisko wskazane w ogłoszeniu, "
        "zgodnie z rozporządzeniem RODO oraz obowiązującymi przepisami.",
        "Oświadczam, że informacje o moim wykształceniu, przebiegu pracy, osiągnięciach i certyfikatach "
        "w części „Treść CV (źródłowa)” pochodzą z dokumentu przekazanego przeze mnie do systemu i są "
        "zgodne z prawdą w zakresie, w jakim je sam udostępniłem.",
        "Część „Dopasowanie do oferty” została przygotowana automatycznie wyłącznie na podstawie tej "
        "treści oraz opisu stanowiska — bez wymyślania nowych faktów biograficznych; służy jako pomoc "
        "w czytelnym przedstawieniu dopasowania do roli.",
        "Składam niniejszą aplikację świadomie, korzystając z funkcji automatycznego aplikowania TWIN.",
    )


def _font_path(explicit: str | None) -> Path | None:
    if explicit and explicit.strip():
        p = Path(explicit.strip())
        if p.is_file():
            return p
    return _DEFAULT_FONT if _DEFAULT_FONT.is_file() else None


def _sanitize_chunk(text: str) -> str:
    """FPDF multi_cell is sensitive to lone surrogates."""
    return text.replace("\r\n", "\n").replace("\r", "\n")


def _write_blocks(pdf: FPDF, paragraphs: Iterable[str], size: int = 11) -> None:
    pdf.set_font_size(size)
    for block in paragraphs:
        b = _sanitize_chunk(block).strip()
        if not b:
            continue
        pdf.multi_cell(0, 5.5, b)
        pdf.ln(2)


def render_application_package_pdf(
    output_path: Path,
    *,
    candidate_name: str,
    job_title: str,
    job_company: str,
    job_board: str,
    motivation_text: str,
    cv_text: str,
    extra_consent_paragraphs: tuple[str, ...] | None = None,
    font_path_override: str | None = None,
) -> Path:
    font = _font_path(font_path_override)
    if font is None:
        raise FileNotFoundError(
            "Brak czcionki Unicode do PDF (NotoSans-Regular.ttf w backend/assets/fonts/ "
            "lub AUTO_APPLY_FONT_PATH).",
        )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    pdf = FPDF(unit="mm", format="A4")
    pdf.set_auto_page_break(auto=True, margin=14)
    pdf.add_page()
    pdf.add_font("AppFont", "", str(font))
    pdf.set_font("AppFont", size=16)
    pdf.multi_cell(0, 8, "Pakiet aplikacyjny (TWIN)")
    pdf.set_font("AppFont", size=11)
    pdf.ln(2)
    meta = f"Kandydat: {candidate_name}\nOferta: {job_title}\nFirma: {job_company}\nPortal: {job_board}"
    _write_blocks(pdf, [meta], size=10)
    pdf.ln(2)

    pdf.set_font("AppFont", size=13)
    pdf.multi_cell(0, 7, "Dopasowanie do oferty")
    pdf.set_font("AppFont", size=11)
    pdf.ln(1)
    _write_blocks(pdf, [motivation_text.strip() or "(brak tekstu dopasowania)"])

    pdf.set_font("AppFont", size=13)
    pdf.multi_cell(0, 7, "Oświadczenia i zgody")
    pdf.set_font("AppFont", size=11)
    pdf.ln(1)
    consent = list(default_consent_paragraphs_pl())
    if extra_consent_paragraphs:
        consent.extend(p.strip() for p in extra_consent_paragraphs if p and p.strip())
    _write_blocks(pdf, consent)

    appendix = _sanitize_chunk(cv_text)[:_MAX_CV_APPEND_CHARS]
    pdf.add_page()
    pdf.set_font("AppFont", size=13)
    pdf.multi_cell(0, 7, "Treść CV (źródłowa, z przekazanego dokumentu)")
    pdf.set_font("AppFont", size=9)
    pdf.ln(2)
    for para in re.split(r"\n{2,}", appendix):
        _write_blocks(pdf, [para], size=9)
        pdf.ln(1)

    pdf.output(str(output_path))
    return output_path
