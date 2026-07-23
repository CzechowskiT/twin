"""Lever ATS API client stub — list postings + dry-run write; token never logged.

Mirrors ``ats_harvest_client`` (Greenhouse). Live write remains gated by
``ATS_LIVE_SYNC`` in ``ats_sync_service`` — this module never performs a live
mutation unless explicitly called with ``dry_run=False`` *and* the caller has
already verified the flag.
"""

from __future__ import annotations

import json
import logging
import urllib.error
import urllib.request
from typing import Any

logger = logging.getLogger(__name__)

LEVER_BASE = "https://api.lever.co/v1"


def _auth_header(access_token: str) -> dict[str, str]:
    # Lever uses Basic auth with API key as username (password empty) or Bearer for OAuth.
    token = (access_token or "").strip()
    if not token:
        raise ValueError("ats_token_missing")
    return {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
        "User-Agent": "TWIN-ATS/1.0",
    }


def _get(path: str, access_token: str, *, params: dict[str, str] | None = None) -> Any:
    from urllib.parse import urlencode

    url = f"{LEVER_BASE}{path}"
    if params:
        url = f"{url}?{urlencode(params)}"
    req = urllib.request.Request(url, headers=_auth_header(access_token), method="GET")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        logger.warning("lever_http_error path=%s status=%s", path, exc.code)
        raise ValueError(f"lever_http_{exc.code}") from exc
    except urllib.error.URLError as exc:
        logger.warning("lever_url_error path=%s", path)
        raise ValueError("lever_unreachable") from exc


def list_postings(access_token: str, *, limit: int = 50) -> list[dict[str, Any]]:
    """List Lever postings (jobs) — read path for vacancy import preview."""
    data = _get("/postings", access_token, params={"limit": str(max(1, min(limit, 100)))})
    if isinstance(data, dict) and isinstance(data.get("data"), list):
        return [x for x in data["data"] if isinstance(x, dict)]
    if isinstance(data, list):
        return [x for x in data if isinstance(x, dict)]
    return []


def list_job_posts(access_token: str, *, per_page: int = 50) -> list[dict[str, Any]]:
    """Alias matching Greenhouse Harvest naming for shared sync callers."""
    return list_postings(access_token, limit=per_page)


def prepare_opportunity_write_payload(
    *,
    application_id: int,
    posting_id: str | None = None,
) -> dict[str, Any]:
    """Build the payload that *would* be sent to Lever — no network I/O."""
    return {
        "provider": "lever",
        "endpoint": "POST /opportunities",
        "application_id": application_id,
        "posting_id": posting_id,
        "ats_write": False,
        "note": "Dry-run stub — live Lever write requires ATS_LIVE_SYNC + partner credentials.",
    }


def dry_run_write_opportunity(
    access_token: str | None,
    *,
    application_id: int,
    posting_id: str | None = None,
) -> dict[str, Any]:
    """Dry-run write framework — never mutates Lever; token presence only validated."""
    token_present = bool((access_token or "").strip())
    payload = prepare_opportunity_write_payload(
        application_id=application_id,
        posting_id=posting_id,
    )
    payload["token_present"] = token_present
    payload["dry_run"] = True
    payload["status"] = "dry_run_ok"
    # Intentionally no HTTP POST — live path is blocked until ATS_LIVE_SYNC.
    return payload


def live_write_opportunity(
    access_token: str,
    *,
    application_id: int,
    posting_id: str | None = None,
    allow_live: bool = False,
) -> dict[str, Any]:
    """Live write gate — raises unless ``allow_live`` (caller must check ATS_LIVE_SYNC)."""
    if not allow_live:
        raise ValueError("ats_live_sync_blocked")
    _ = _auth_header(access_token)  # validate token shape without logging it
    raise ValueError("lever_live_write_not_wired")
