"""Map ISO country codes to coarse legal buckets for UI defaults (not legal advice)."""

EU_EEA = frozenset(
    {
        "AT",
        "BE",
        "BG",
        "HR",
        "CY",
        "CZ",
        "DK",
        "EE",
        "FI",
        "FR",
        "DE",
        "GR",
        "HU",
        "IE",
        "IT",
        "LV",
        "LT",
        "LU",
        "MT",
        "NL",
        "PL",
        "PT",
        "RO",
        "SK",
        "SI",
        "ES",
        "SE",
        "IS",
        "LI",
        "NO",
    }
)


def country_to_legal_region(country: str | None) -> str:
    if not country or len(country) != 2:
        return "OTHER"
    cc = country.strip().upper()
    if cc in EU_EEA:
        return "EU_EEA"
    if cc == "GB":
        return "UK"
    if cc == "US":
        return "US"
    if cc == "CH":
        return "CH"
    if cc == "JP":
        return "JP"
    if cc == "CN":
        return "CN"
    return "OTHER"


def normalize_country_header(value: str | None) -> str | None:
    if not value:
        return None
    v = value.strip().upper()
    if len(v) != 2 or v in {"XX", "T1"}:
        return None
    return v
