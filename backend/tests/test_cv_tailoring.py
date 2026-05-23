"""CV tailoring helpers for auto-apply motivation fields."""

import re

from app.services.cv_tailoring import (
    build_cv_tailoring_blob,
    build_motivation_text_for_auto_apply,
    get_tailoring_pitch_for_job,
)

_POLISH_DIACRITICS = re.compile(r"[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]")


def test_get_tailoring_pitch_when_job_id_matches() -> None:
    signals = {
        "cv_tailoring": {
            "job_id": 5,
            "pitch_paragraph": "Hello",
            "strength_bullets": ["One", "Two"],
            "locale": "en",
        }
    }
    out = get_tailoring_pitch_for_job(signals, 5)
    assert out is not None
    assert "Hello" in out
    assert "One" in out


def test_get_tailoring_pitch_when_job_id_mismatches() -> None:
    signals = {"cv_tailoring": {"job_id": 5, "pitch_paragraph": "X", "strength_bullets": []}}
    assert get_tailoring_pitch_for_job(signals, 99) is None


def test_get_tailoring_pitch_generic_job_id_null() -> None:
    signals = {"cv_tailoring": {"job_id": None, "pitch_paragraph": "Generic", "strength_bullets": []}}
    assert get_tailoring_pitch_for_job(signals, 123) == "Generic"


def test_build_tailoring_blob_shape() -> None:
    blob = build_cv_tailoring_blob(
        "Python developer\n• Built APIs\n• Led team",
        target_job_title="Backend Engineer",
        job_id=None,
        company=None,
        job_context="We need Python",
        locale="en",
    )
    assert blob["target_job_title"] == "Backend Engineer"
    assert blob["job_id"] is None
    assert "pitch_paragraph" in blob
    assert isinstance(blob["strength_bullets"], list)
    assert blob["source"] in ("claude", "fallback")
    assert blob["locale"] == "en"


def test_fallback_tailoring_english_has_no_polish_diacritics() -> None:
    blob = build_cv_tailoring_blob(
        "Anna Nowak\n• Managed B2B sales team\n• Salesforce CRM",
        target_job_title="Sales Director",
        job_id=None,
        company="Contoso",
        job_context="B2B sales leadership",
        locale="en",
    )
    combined = blob["pitch_paragraph"] + " ".join(blob["strength_bullets"])
    assert not _POLISH_DIACRITICS.search(combined)
    assert "Sales Director" in blob["pitch_paragraph"]


def test_fallback_tailoring_polish_when_locale_pl() -> None:
    blob = build_cv_tailoring_blob(
        "Anna Nowak\n• Zarządzanie zespołem",
        target_job_title="Dyrektor sprzedaży",
        job_id=None,
        company=None,
        job_context=None,
        locale="pl",
    )
    assert _POLISH_DIACRITICS.search(blob["pitch_paragraph"])


def test_build_motivation_text_for_auto_apply_english_fallback() -> None:
    txt = build_motivation_text_for_auto_apply(
        "Anna Nowak\n• Enterprise sales leadership\n• CRM",
        job_title="Sales Director",
        company="Contoso",
        job_context="B2B sales, Warsaw",
        locale="en",
    )
    assert "Sales Director" in txt
    assert not _POLISH_DIACRITICS.search(txt)
    assert len(txt) > 40
