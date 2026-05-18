"""CV tailoring helpers for auto-apply motivation fields."""

from app.services.cv_tailoring import (
    build_cv_tailoring_blob,
    build_motivation_text_for_auto_apply,
    get_tailoring_pitch_for_job,
)


def test_get_tailoring_pitch_when_job_id_matches() -> None:
    signals = {
        "cv_tailoring": {
            "job_id": 5,
            "pitch_paragraph": "Hello",
            "strength_bullets": ["One", "Two"],
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
    )
    assert blob["target_job_title"] == "Backend Engineer"
    assert blob["job_id"] is None
    assert "pitch_paragraph" in blob
    assert isinstance(blob["strength_bullets"], list)
    assert blob["source"] in ("claude", "fallback")


def test_build_motivation_text_for_auto_apply_fallback() -> None:
    txt = build_motivation_text_for_auto_apply(
        "Anna Nowak\n• Zarządzanie zespołem sprzedaży\n• CRM Salesforce",
        job_title="Sales Director",
        company="Contoso",
        job_context="B2B sales, Warsaw",
    )
    assert "Sales Director" in txt or "sprzedaż" in txt.lower()
    assert len(txt) > 40
