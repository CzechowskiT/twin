"""Resolve client country from CDN headers, IP databases (HTTPS), or optional lat/lon reverse geocode."""

from __future__ import annotations

import ipaddress
import logging
import re

import httpx
from fastapi import Request

from app.services.geo_jurisdiction import normalize_country_header

logger = logging.getLogger(__name__)

_NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse"
_NOMINATIM_UA = "TWIN/1.0 (https://github.com/CzechowskiT/twin; jurisdiction hints)"


def _is_public_ip(ip: str) -> bool:
    try:
        addr = ipaddress.ip_address(ip.strip())
    except ValueError:
        return False
    return not (addr.is_private or addr.is_loopback or addr.is_link_local or addr.is_reserved)


def client_ip_from_request(request: Request) -> str | None:
    """Best client IP behind one or more reverse proxies."""
    cf = request.headers.get("cf-connecting-ip")
    if cf:
        return cf.strip().split(",")[0].strip()
    true_client = request.headers.get("true-client-ip")
    if true_client:
        return true_client.strip().split(",")[0].strip()
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return None


def country_from_cloudflare(request: Request) -> tuple[str | None, str | None]:
    """Return (country_code, source_tag) if CF-IPCountry is usable."""
    raw = request.headers.get("cf-ipcountry")
    cc = normalize_country_header(raw)
    if cc:
        return cc, "cloudflare_header"
    return None, None


def country_from_ip_whois(ip: str) -> str | None:
    """HTTPS lookup via ipwho.is (no API key for basic usage)."""
    if not _is_public_ip(ip):
        return None
    try:
        with httpx.Client(timeout=3.0) as client:
            r = client.get(f"https://ipwho.is/{ip}")
            r.raise_for_status()
            data = r.json()
    except (httpx.HTTPError, ValueError, TypeError) as e:
        logger.info("ipwho.is lookup failed for %s: %s", ip, e)
        return None
    if not data.get("success"):
        return None
    cc = data.get("country_code")
    if isinstance(cc, str) and len(cc) == 2:
        return cc.upper()
    return None


def country_from_coordinates(lat: float, lon: float) -> str | None:
    """Reverse geocode with OpenStreetMap Nominatim (rate-limited; use sparingly)."""
    try:
        with httpx.Client(timeout=5.0) as client:
            r = client.get(
                _NOMINATIM_URL,
                params={"lat": lat, "lon": lon, "format": "json", "zoom": 3, "addressdetails": "0"},
                headers={"User-Agent": _NOMINATIM_UA},
            )
            r.raise_for_status()
            data = r.json()
    except (httpx.HTTPError, ValueError, TypeError) as e:
        logger.info("nominatim reverse failed: %s", e)
        return None
    addr = data.get("address")
    if isinstance(addr, dict):
        cc = addr.get("country_code")
        if isinstance(cc, str) and len(cc) == 2:
            return cc.upper()
    # fallback: parse from display_name country code pattern rare
    return None


_COORD_RE = re.compile(r"^-?\d+(\.\d+)?$")


def parse_coordinate(value: str | None, min_v: float, max_v: float) -> float | None:
    if value is None or not _COORD_RE.match(value.strip()):
        return None
    try:
        f = float(value)
    except ValueError:
        return None
    if not (min_v <= f <= max_v):
        return None
    return f
