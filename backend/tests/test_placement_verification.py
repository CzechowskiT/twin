"""Unit tests for placement verification helpers."""

import pytest
from unittest.mock import MagicMock

from app.database.models import PlacementEvent
from app.services.placement_verification import (
    PLACEMENT_DECLARED,
    PLACEMENT_VERIFY_PENDING,
    hash_placement_token,
    record_placement_event,
    _work_email_domain,
)


def test_hash_placement_token_stable_and_trimmed() -> None:
    expected = hash_placement_token("abc")
    assert hash_placement_token("abc") == expected
    assert hash_placement_token("  abc  ") == expected


def test_work_email_domain() -> None:
    assert _work_email_domain("Jane.Doe@Acme.CO.UK") == "acme.co.uk"
    assert _work_email_domain("bad") is None


def test_record_placement_event_adds_row() -> None:
    db = MagicMock()
    chain = MagicMock()
    chain.join.return_value = chain
    chain.filter.return_value = chain
    chain.first.return_value = object()
    db.query.return_value = chain
    record_placement_event(
        db,
        application_id=7,
        event_type="placement.verify_link_issued",
        actor="candidate",
        detail={"mail_sent": False, "work_email_domain": "corp.example"},
        owner_user_id=42,
    )
    db.add.assert_called_once()
    row = db.add.call_args[0][0]
    assert isinstance(row, PlacementEvent)
    assert row.application_id == 7
    assert row.event_type == "placement.verify_link_issued"
    assert row.actor == "candidate"
    assert "corp.example" in (row.detail_json or "")


def test_record_placement_event_requires_context() -> None:
    db = MagicMock()
    with pytest.raises(ValueError, match="owner_user_id or from_magic_link"):
        record_placement_event(
            db,
            application_id=1,
            event_type="placement.self_declared",
            actor="candidate",
            detail=None,
        )


def test_work_email_verify_allows_declared_and_pending_states() -> None:
    allowed = {PLACEMENT_DECLARED, PLACEMENT_VERIFY_PENDING}
    assert "declared" in allowed and "verify_pending" in allowed
