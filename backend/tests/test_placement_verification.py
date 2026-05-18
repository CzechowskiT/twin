"""Unit tests for placement verification helpers."""

from app.services.placement_verification import hash_placement_token


def test_hash_placement_token_stable_and_trimmed() -> None:
    expected = hash_placement_token("abc")
    assert hash_placement_token("abc") == expected
    assert hash_placement_token("  abc  ") == expected
