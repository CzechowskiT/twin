"""Naming and validation rules for persisted API idempotency keys."""

from __future__ import annotations

import pytest

from app.services.idempotency import normalize_idempotency_key


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("checkout_retry_01", "checkout_retry_01"),
        ("billing-replay-evt-0001", "billing-replay-evt-0001"),
        ("  abcdefgh  ", "abcdefgh"),
        ("A1B2C3D4", "A1B2C3D4"),
    ],
)
def test_normalize_idempotency_key_accepts_supported_naming(raw: str, expected: str) -> None:
    assert normalize_idempotency_key(raw) == expected


@pytest.mark.parametrize(
    "raw",
    [
        None,
        "",
        "short",
        "bad key with spaces",
        "bad/slash",
        "bad.dot",
        "x" * 129,
    ],
)
def test_normalize_idempotency_key_rejects_invalid_names(raw: str | None) -> None:
    assert normalize_idempotency_key(raw) is None
