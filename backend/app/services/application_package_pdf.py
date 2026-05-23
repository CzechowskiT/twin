"""Single PDF for auto-apply: tailored pitch, legal-style consent, verbatim CV appendix."""

from __future__ import annotations

import re
from io import BytesIO
from pathlib import Path
from typing import Iterable

from fpdf import FPDF

from app.services.request_locale import is_polish_locale

_BACKEND_ROOT = Path(__file__).resolve().parent.parent.parent
_DEFAULT_FONT = _BACKEND_ROOT / "assets" / "fonts" / "NotoSans-Regular.ttf"
_MAX_CV_APPEND_CHARS = 45_000


def default_consent_paragraphs_en() -> tuple[str, ...]:
    """Recruitment consent + truthfulness (English)."""
    return (
        "I consent to the processing of my personal data contained in this application "
        "and the attached CV for recruitment for the role indicated in the job posting, "
        "in accordance with applicable data protection law.",
        "I declare that the information about my education, work history, achievements, and "
        "certificates in the “Source CV” section comes from the document I provided and is "
        "accurate to the best of my knowledge.",
        "The “Role fit” section was prepared automatically based only on that content and "
        "the job description — without inventing new biographical facts; it helps present "
        "fit for the role clearly.",
        "I submit this application knowingly, using TWIN’s auto-apply feature.",
    )


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


def _package_copy(locale: str) -> dict[str, str]:
    if is_polish_locale(locale):
        return {
            "title": "Pakiet aplikacyjny (TWIN)",
            "meta": "Kandydat: {name}\nOferta: {title}\nFirma: {company}\nPortal: {board}",
            "fit_heading": "Dopasowanie do oferty",
            "fit_empty": "(brak tekstu dopasowania)",
            "consent_heading": "Oświadczenia i zgody",
            "cv_heading": "Treść CV (źródłowa, z przekazanego dokumentu)",
            "font_error": (
                "Brak czcionki Unicode do PDF (NotoSans-Regular.ttf w backend/assets/fonts/ "
                "lub AUTO_APPLY_FONT_PATH)."
            ),
        }
    return {
        "title": "Application package (TWIN)",
        "meta": "Candidate: {name}\nRole: {title}\nCompany: {company}\nBoard: {board}",
        "fit_heading": "Role fit",
        "fit_empty": "(no tailoring text)",
        "consent_heading": "Declarations and consents",
        "cv_heading": "Source CV (from uploaded document)",
        "font_error": (
            "Missing Unicode font for PDF (NotoSans-Regular.ttf in backend/assets/fonts/ "
            "or AUTO_APPLY_FONT_PATH)."
        ),
    }


def _build_package_fpdf(
    *,
    candidate_name: str,
    job_title: str,
    job_company: str,
    job_board: str,
    motivation_text: str,
    cv_text: str,
    extra_consent_paragraphs: tuple[str, ...] | None = None,
    font_path_override: str | None = None,
    locale: str = "en",
) -> FPDF:
    copy = _package_copy(locale)
    font = _font_path(font_path_override)
    if font is None:
        raise FileNotFoundError(copy["font_error"])

    pdf = FPDF(unit="mm", format="A4")
    pdf.set_auto_page_break(auto=True, margin=14)
    pdf.add_page()
    pdf.add_font("AppFont", "", str(font))
    pdf.set_font("AppFont", size=16)
    pdf.multi_cell(0, 8, copy["title"])
    pdf.set_font("AppFont", size=11)
    pdf.ln(2)
    meta = copy["meta"].format(
        name=candidate_name,
        title=job_title,
        company=job_company,
        board=job_board,
    )
    _write_blocks(pdf, [meta], size=10)
    pdf.ln(2)

    pdf.set_font("AppFont", size=13)
    pdf.multi_cell(0, 7, copy["fit_heading"])
    pdf.set_font("AppFont", size=11)
    pdf.ln(1)
    _write_blocks(pdf, [motivation_text.strip() or copy["fit_empty"]])

    pdf.set_font("AppFont", size=13)
    pdf.multi_cell(0, 7, copy["consent_heading"])
    pdf.set_font("AppFont", size=11)
    pdf.ln(1)
    consent = list(
        default_consent_paragraphs_pl() if is_polish_locale(locale) else default_consent_paragraphs_en()
    )
    if extra_consent_paragraphs:
        consent.extend(p.strip() for p in extra_consent_paragraphs if p and p.strip())
    _write_blocks(pdf, consent)

    appendix = _sanitize_chunk(cv_text)[:_MAX_CV_APPEND_CHARS]
    pdf.add_page()
    pdf.set_font("AppFont", size=13)
    pdf.multi_cell(0, 7, copy["cv_heading"])
    pdf.set_font("AppFont", size=9)
    pdf.ln(2)
    for para in re.split(r"\n{2,}", appendix):
        _write_blocks(pdf, [para], size=9)
        pdf.ln(1)
    return pdf


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
    locale: str = "en",
) -> Path:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    pdf = _build_package_fpdf(
        candidate_name=candidate_name,
        job_title=job_title,
        job_company=job_company,
        job_board=job_board,
        motivation_text=motivation_text,
        cv_text=cv_text,
        extra_consent_paragraphs=extra_consent_paragraphs,
        font_path_override=font_path_override,
        locale=locale,
    )
    pdf.output(str(output_path))
    return output_path


def render_application_package_pdf_bytes(
    *,
    candidate_name: str,
    job_title: str,
    job_company: str,
    job_board: str,
    motivation_text: str,
    cv_text: str,
    extra_consent_paragraphs: tuple[str, ...] | None = None,
    font_path_override: str | None = None,
    locale: str = "en",
) -> bytes:
    """Same PDF as ``render_application_package_pdf`` but returned as bytes (for S3 upload)."""
    pdf = _build_package_fpdf(
        candidate_name=candidate_name,
        job_title=job_title,
        job_company=job_company,
        job_board=job_board,
        motivation_text=motivation_text,
        cv_text=cv_text,
        extra_consent_paragraphs=extra_consent_paragraphs,
        font_path_override=font_path_override,
        locale=locale,
    )
    raw = pdf.output(dest="S")
    return bytes(raw) if not isinstance(raw, bytes) else raw
