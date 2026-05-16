"""HTTP client for Authologic Customer API (OpenAPI 1.1).

Docs: https://developer.authologic.com — sandbox base defaults to official spec servers entry.
"""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.config import Settings

logger = logging.getLogger(__name__)

AUTHOLOGIC_MEDIA = "application/vnd.authologic.v1.1+json"


class AuthologicClientError(Exception):
    """Configuration or upstream Authologic failure."""


def is_authologic_configured(settings: Settings) -> bool:
    return bool(
        settings.authologic_api_base_url.strip()
        and settings.authologic_api_login.strip()
        and settings.authologic_api_key.strip()
        and settings.authologic_strategy.strip()
    )


def _headers() -> dict[str, str]:
    return {"Content-Type": AUTHOLOGIC_MEDIA, "Accept": AUTHOLOGIC_MEDIA}


def _base(settings: Settings) -> str:
    return settings.authologic_api_base_url.strip().rstrip("/")


def create_conversation(
    settings: Settings,
    *,
    user_key: str,
    return_url: str,
    callback_url: str | None,
    strategy: str | None = None,
    query: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """POST /api/conversations — returns ConversationInfo (id, url, status, result, …)."""
    if not is_authologic_configured(settings):
        raise AuthologicClientError("Authologic is not configured")

    body: dict[str, Any] = {
        "userKey": user_key,
        "returnUrl": return_url,
        "strategy": (strategy or settings.authologic_strategy).strip(),
        "query": query
        if query is not None
        else {
            "identity": {
                "requireOneOf": [["PERSON_NAME_FIRSTNAME", "PERSON_NAME_LASTNAME"]],
                "optional": [{"list": ["PERSON_CONTACT_EMAIL_OTP"]}],
            }
        },
    }
    if callback_url:
        body["callbackUrl"] = callback_url

    url = f"{_base(settings)}/api/conversations"
    try:
        with httpx.Client(timeout=30.0) as client:
            r = client.post(
                url,
                json=body,
                headers=_headers(),
                auth=(settings.authologic_api_login.strip(), settings.authologic_api_key.strip()),
            )
    except httpx.RequestError as e:
        logger.warning("Authologic create conversation transport error: %s", e)
        raise AuthologicClientError("Could not reach Authologic") from e

    if r.status_code >= 400:
        logger.warning(
            "Authologic create conversation failed: status=%s body=%s",
            r.status_code,
            (r.text[:500] if r.text else ""),
        )
        raise AuthologicClientError(f"Authologic error HTTP {r.status_code}")

    return r.json()


def get_conversation(settings: Settings, conversation_id: str) -> dict[str, Any]:
    """GET /api/conversations/{conversationId}."""
    if not is_authologic_configured(settings):
        raise AuthologicClientError("Authologic is not configured")

    url = f"{_base(settings)}/api/conversations/{conversation_id}"
    try:
        with httpx.Client(timeout=30.0) as client:
            r = client.get(
                url,
                headers=_headers(),
                auth=(settings.authologic_api_login.strip(), settings.authologic_api_key.strip()),
            )
    except httpx.RequestError as e:
        logger.warning("Authologic get conversation transport error: %s", e)
        raise AuthologicClientError("Could not reach Authologic") from e

    if r.status_code == 404:
        raise AuthologicClientError("Conversation not found")
    if r.status_code >= 400:
        logger.warning(
            "Authologic get conversation failed: status=%s body=%s",
            r.status_code,
            (r.text[:500] if r.text else ""),
        )
        raise AuthologicClientError(f"Authologic error HTTP {r.status_code}")

    return r.json()
