"""URL safety / SSRF guard unit tests."""

from __future__ import annotations

import pytest

from app.services.url_safety import assert_public_https_url, hostname_is_cimd_allowlisted


def test_cimd_allowlist() -> None:
    assert hostname_is_cimd_allowlisted("chatgpt.com")
    assert hostname_is_cimd_allowlisted("cdn.openai.com")
    assert not hostname_is_cimd_allowlisted("evil.example")
    assert not hostname_is_cimd_allowlisted("169.254.169.254")


def test_blocks_private_literal_ips() -> None:
    with pytest.raises(ValueError, match="ssrf_blocked"):
        assert_public_https_url("https://10.0.0.5/hook")
    with pytest.raises(ValueError, match="ssrf_blocked"):
        assert_public_https_url("https://192.168.1.1/x")
    with pytest.raises(ValueError, match="ssrf_blocked"):
        assert_public_https_url("https://127.0.0.1/hook")


def test_blocks_localhost_host() -> None:
    with pytest.raises(ValueError, match="ssrf_blocked"):
        assert_public_https_url("https://localhost/hook")


def test_requires_https() -> None:
    with pytest.raises(ValueError, match="must_be_https"):
        assert_public_https_url("http://example.com/hook")
