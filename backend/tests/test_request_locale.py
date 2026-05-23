"""Request locale resolution from headers."""

from app.services.request_locale import locale_from_request, normalize_locale, resolve_request_locale


class _Headers:
    def __init__(self, mapping: dict[str, str]) -> None:
        self._mapping = {k.lower(): v for k, v in mapping.items()}

    def get(self, key: str) -> str | None:
        return self._mapping.get(key.lower())


class _Req:
    def __init__(self, headers: dict[str, str]) -> None:
        self.headers = _Headers(headers)


def test_normalize_locale_defaults_to_en() -> None:
    assert normalize_locale(None) == "en"
    assert normalize_locale("") == "en"
    assert normalize_locale("en-US") == "en"
    assert normalize_locale("pl") == "pl"
    assert normalize_locale("pl-PL") == "pl"


def test_resolve_prefers_x_locale() -> None:
    assert resolve_request_locale(x_locale="pl", accept_language="en") == "pl"
    assert resolve_request_locale(x_locale="en", accept_language="pl,en") == "en"


def test_locale_from_request() -> None:
    req = _Req({"x-locale": "en", "accept-language": "pl"})
    assert locale_from_request(req) == "en"
