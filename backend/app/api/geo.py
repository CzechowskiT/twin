"""Public jurisdiction hints from IP / optional coordinates (for legal UI defaults)."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Query, Request

from app.config import get_settings
from app.schemas.geo import JurisdictionHintOut
from app.services.geo_ip import (
    client_ip_from_request,
    country_from_cloudflare,
    country_from_coordinates,
    country_from_ip_whois,
    parse_coordinate,
)
from app.services.geo_jurisdiction import country_to_legal_region

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/jurisdiction-hint", response_model=JurisdictionHintOut)
def jurisdiction_hint(
    request: Request,
    lat: str | None = Query(default=None, description="Optional WGS84 latitude (browser geolocation)"),
    lon: str | None = Query(default=None, description="Optional WGS84 longitude"),
) -> JurisdictionHintOut:
    """Return coarse legal region for consent screens. Does not authenticate users."""
    settings = get_settings()
    if not settings.geo_jurisdiction_lookup_enabled:
        return JurisdictionHintOut(country_code=None, legal_region="OTHER", source="disabled")

    lat_f = parse_coordinate(lat, -90.0, 90.0) if lat else None
    lon_f = parse_coordinate(lon, -180.0, 180.0) if lon else None
    if lat_f is not None and lon_f is not None:
        cc = country_from_coordinates(lat_f, lon_f)
        if cc:
            return JurisdictionHintOut(
                country_code=cc,
                legal_region=country_to_legal_region(cc),
                source="coordinates",
            )
        return JurisdictionHintOut(country_code=None, legal_region="OTHER", source="coordinates_failed")

    cc_cf, _src_cf = country_from_cloudflare(request)
    if cc_cf:
        return JurisdictionHintOut(
            country_code=cc_cf,
            legal_region=country_to_legal_region(cc_cf),
            source="cloudflare_header",
        )

    ip = client_ip_from_request(request)
    if not ip:
        return JurisdictionHintOut(country_code=None, legal_region="OTHER", source="fallback")

    cc = country_from_ip_whois(ip)
    if cc:
        return JurisdictionHintOut(
            country_code=cc,
            legal_region=country_to_legal_region(cc),
            source="ip_lookup",
        )

    logger.debug("jurisdiction-hint: no country for ip=%s", ip)
    return JurisdictionHintOut(country_code=None, legal_region="OTHER", source="fallback")
