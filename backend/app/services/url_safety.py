"""SSRF-safe URL checks for outbound fetches (Zapier targets, CIMD metadata)."""

from __future__ import annotations

import ipaddress
import socket
from urllib.parse import urlparse

# Hosts allowed for unauthenticated CIMD client_id metadata fetches.
CIMD_HOST_SUFFIXES = (
    "chatgpt.com",
    "openai.com",
    "oaistatic.com",
)


def hostname_is_cimd_allowlisted(host: str) -> bool:
    h = (host or "").lower().rstrip(".")
    if not h:
        return False
    return any(h == suffix or h.endswith("." + suffix) for suffix in CIMD_HOST_SUFFIXES)


def _ip_is_blocked(addr: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    return bool(
        addr.is_private
        or addr.is_loopback
        or addr.is_link_local
        or addr.is_reserved
        or addr.is_multicast
        or addr.is_unspecified
    )


def _host_resolves_to_blocked_ip(host: str) -> bool:
    """True when any A/AAAA for host is private/loopback/link-local/reserved."""
    try:
        infos = socket.getaddrinfo(host, None)
    except socket.gaierror:
        return True
    if not infos:
        return True
    for info in infos:
        ip_str = info[4][0]
        try:
            addr = ipaddress.ip_address(ip_str)
        except ValueError:
            return True
        if _ip_is_blocked(addr):
            return True
    return False


def assert_public_https_url(
    url: str,
    *,
    allow_localhost_prefixes: tuple[str, ...] = (),
) -> str:
    """Validate HTTPS URL does not target private/metadata addresses.

    Raises ValueError with stable codes used by callers.
    Re-checks after DNS resolution to mitigate naive hostname allowlists /
    DNS rebinding to RFC1918 / link-local / metadata.
    """
    raw = (url or "").strip()
    parsed = urlparse(raw)
    if parsed.scheme != "https" or not parsed.netloc:
        raise ValueError("target_url_must_be_https")
    host = (parsed.hostname or "").lower()
    if not host:
        raise ValueError("target_url_ssrf_blocked")

    for prefix in allow_localhost_prefixes:
        if raw.startswith(prefix.rstrip("/")):
            return raw

    blocked_hosts = {
        "localhost",
        "metadata.google.internal",
        "metadata.google",
        "instance-data",
    }
    if host in blocked_hosts or host.endswith(".localhost") or host.endswith(".internal"):
        raise ValueError("target_url_ssrf_blocked")
    if host.startswith("169.254.") or host == "metadata":
        raise ValueError("target_url_ssrf_blocked")

    try:
        addr = ipaddress.ip_address(host)
    except ValueError:
        addr = None

    if addr is not None:
        if _ip_is_blocked(addr):
            raise ValueError("target_url_ssrf_blocked")
        return raw

    # Always resolve — block if ANY A/AAAA is non-public (DNS rebinding defense).
    if _host_resolves_to_blocked_ip(host):
        raise ValueError("target_url_ssrf_blocked")

    return raw
