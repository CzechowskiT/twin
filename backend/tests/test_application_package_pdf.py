"""Application PDF package for auto-apply."""

from pathlib import Path

from pypdf import PdfReader

from app.services.application_package_pdf import render_application_package_pdf


def test_render_application_package_pdf_contains_sections(tmp_path: Path) -> None:
    font = Path(__file__).resolve().parents[1] / "assets" / "fonts" / "NotoSans-Regular.ttf"
    if not font.is_file():
        raise AssertionError("Missing NotoSans-Regular.ttf — run from repo with backend/assets/fonts populated.")

    out = tmp_path / "pkg.pdf"
    render_application_package_pdf(
        out,
        candidate_name="Jan Test",
        job_title="Developer",
        job_company="ACME",
        job_board="pracuj.pl",
        motivation_text="Pitch line one.\n\n• Bullet A\n• Bullet B",
        cv_text="CV line 1\n\nCV paragraph two.",
        font_path_override=str(font),
    )
    assert out.is_file() and out.stat().st_size > 500
    reader = PdfReader(str(out))
    text = "".join((p.extract_text() or "") for p in reader.pages)
    assert "Pakiet aplikacyjny" in text
    assert "Oświadczenia" in text
    assert "Pitch line one" in text
    assert "CV line 1" in text
