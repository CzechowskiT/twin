"""Unit tests for geo → legal region mapping."""

from app.services.geo_jurisdiction import country_to_legal_region, normalize_country_header


def test_poland_is_eu():
    assert country_to_legal_region("PL") == "EU_EEA"


def test_us():
    assert country_to_legal_region("US") == "US"


def test_gb_uk():
    assert country_to_legal_region("GB") == "UK"


def test_unknown():
    assert country_to_legal_region("ZZ") == "OTHER"
    assert country_to_legal_region(None) == "OTHER"


def test_cf_header_normalization():
    assert normalize_country_header(" pl ") == "PL"
    assert normalize_country_header("XX") is None
