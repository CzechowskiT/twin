"""Migration hardening — 070→073 chain fixtures and destructive op awareness."""

from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
VERSIONS = REPO_ROOT / "backend/alembic/versions"

WAVE_FILES = [
    "070_candidate_trust_center.py",
    "071_recruiter_workspace_activation.py",
    "072_recruiter_talent_pool_trust_review_c2.py",
]


def _read_revision_meta(filename: str) -> tuple[str, str | None]:
    import re

    text = (VERSIONS / filename).read_text(encoding="utf-8")
    rev_m = re.search(r'revision:\s*str\s*=\s*"([^"]+)"', text)
    down_m = re.search(r'down_revision:\s*[^=]*=\s*"([^"]+)"', text)
    assert rev_m, f"missing revision in {filename}"
    return rev_m.group(1), down_m.group(1) if down_m else None


def test_070_to_072_linear_on_branch() -> None:
    prev: str | None = None
    for f in WAVE_FILES:
        rev, down = _read_revision_meta(f)
        if prev is not None:
            assert down == prev, f"{f} down_revision mismatch"
        prev = rev


def test_072_chain_continues_past_partial_branch() -> None:
    """073+ exist on scaffold — partial-branch assumption no longer holds."""
    assert (VERSIONS / "073_candidate_referrals.py").exists()
    assert (VERSIONS / "096_connector_secret_hash_widen.py").exists()


def test_wave_migrations_no_drop_table_in_upgrade() -> None:
    import re

    for f in WAVE_FILES:
        text = (VERSIONS / f).read_text(encoding="utf-8")
        upgrade_body = re.split(r"def downgrade\(\)", text, maxsplit=1)[0]
        assert "drop_table" not in upgrade_body.lower(), f"{f} upgrade contains drop_table"


def test_071_creates_activation_tables() -> None:
    text = (VERSIONS / "071_recruiter_workspace_activation.py").read_text(encoding="utf-8")
    assert "recruiter_workspace_activation" in text
    assert "recruiter_activation_events" in text


def test_072_creates_trust_review_tables() -> None:
    text = (VERSIONS / "072_recruiter_talent_pool_trust_review_c2.py").read_text(encoding="utf-8")
    assert "recruiter_trust_review_items" in text
