"""URL safety / SSRF guard unit tests."""

from __future__ import annotations

from unittest.mock import patch

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
        assert_public_https_url("https://172.16.9.9/x")
    with pytest.raises(ValueError, match="ssrf_blocked"):
        assert_public_https_url("https://127.0.0.1/hook")


def test_blocks_link_local_and_metadata_hosts() -> None:
    with pytest.raises(ValueError, match="ssrf_blocked"):
        assert_public_https_url("https://169.254.169.254/latest/meta-data/")
    with pytest.raises(ValueError, match="ssrf_blocked"):
        assert_public_https_url("https://metadata.google.internal/computeMetadata/v1/")


def test_blocks_localhost_host() -> None:
    with pytest.raises(ValueError, match="ssrf_blocked"):
        assert_public_https_url("https://localhost/hook")
    with pytest.raises(ValueError, match="ssrf_blocked"):
        assert_public_https_url("https://foo.localhost/hook")


def test_requires_https() -> None:
    with pytest.raises(ValueError, match="must_be_https"):
        assert_public_https_url("http://example.com/hook")


def test_dns_rebinding_to_private_ip_blocked(monkeypatch: pytest.MonkeyPatch) -> None:
    """Hostname looks public but resolves to RFC1918 — must block."""

    def fake_getaddrinfo(host: str, _port: object, *args: object, **kwargs: object):  # noqa: ANN001
        assert host == "evil.example"
        # (family, type, proto, canonname, sockaddr)
        return [(2, 1, 6, "", ("10.1.2.3", 0))]

    monkeypatch.setattr("app.services.url_safety.socket.getaddrinfo", fake_getaddrinfo)
    with pytest.raises(ValueError, match="ssrf_blocked"):
        assert_public_https_url("https://evil.example/hook")


def test_dns_failure_fail_closed(monkeypatch: pytest.MonkeyPatch) -> None:
    import socket

    def boom(*_a: object, **_k: object):  # noqa: ANN001
        raise socket.gaierror("nxdomain")

    monkeypatch.setattr("app.services.url_safety.socket.getaddrinfo", boom)
    with pytest.raises(ValueError, match="ssrf_blocked"):
        assert_public_https_url("https://does-not-resolve.invalid/hook")


def test_public_resolution_allowed(monkeypatch: pytest.MonkeyPatch) -> None:
    def fake_getaddrinfo(host: str, _port: object, *args: object, **kwargs: object):  # noqa: ANN001
        return [(2, 1, 6, "", ("93.184.216.34", 0))]  # example.com public

    monkeypatch.setattr("app.services.url_safety.socket.getaddrinfo", fake_getaddrinfo)
    assert assert_public_https_url("https://example.com/hook") == "https://example.com/hook"
