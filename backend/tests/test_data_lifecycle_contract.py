"""Data lifecycle contract markers — static regression guard."""

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
DOC = REPO_ROOT / "docs/DATA_LIFECYCLE_CONTRACT_2026-07-13.md"

MODULE_MARKERS = [
    "Career Compass",
    "Trust Center",
    "Referrals",
    "Recruiter Activation",
    "Talent Pool",
    "Trust Review Queue",
]


def test_data_lifecycle_doc_exists() -> None:
    assert DOC.is_file()


def test_all_modules_in_contract() -> None:
    text = DOC.read_text(encoding="utf-8")
    for marker in MODULE_MARKERS:
        assert marker in text, f"missing {marker}"


def test_cross_tenant_mentioned() -> None:
    text = DOC.read_text(encoding="utf-8")
    assert "Cross-tenant" in text or "cross-tenant" in text
