"""Shared OAuth2 CSRF state (JWT) for all providers."""

from app.core.security import create_access_token, decode_access_token

_OAUTH_STATE_SUBJECT = "__oauth_state__"


def create_oauth_state() -> str:
    return create_access_token(_OAUTH_STATE_SUBJECT)


def verify_oauth_state(state: str) -> bool:
    return decode_access_token(state) == _OAUTH_STATE_SUBJECT
