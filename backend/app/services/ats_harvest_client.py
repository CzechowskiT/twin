"""Greenhouse Harvest API client — token never logged."""

from __future__ import annotations

import json
import logging
import urllib.error
import urllib.request
from typing import Any

logger = logging.getLogger(__name__)

HARVEST_BASE = "https://harvest.greenhouse.io/v1"


def _auth_header(access_token: str) -> dict[str, str]:
    # Greenhouse Harvest uses Basic auth with API token as username (password empty)
    # or Bearer depending on OAuth — OAuth access tokens use Bearer.
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

    url = f"{HARVEST_BASE}{path}"
    if params:
        url = f"{url}?{urlencode(params)}"
    req = urllib.request.Request(url, headers=_auth_header(access_token), method="GET")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        logger.warning("harvest_http_error path=%s status=%s", path, exc.code)
        raise ValueError(f"harvest_http_{exc.code}") from exc
    except urllib.error.URLError as exc:
        logger.warning("harvest_url_error path=%s", path)
        raise ValueError("harvest_unreachable") from exc


def list_job_posts(access_token: str, *, per_page: int = 50) -> list[dict[str, Any]]:
    """List job posts from Greenhouse Harvest."""
    data = _get("/job_posts", access_token, params={"per_page": str(max(1, min(per_page, 100)))})
    if isinstance(data, list):
        return [x for x in data if isinstance(x, dict)]
    if isinstance(data, dict) and isinstance(data.get("job_posts"), list):
        return [x for x in data["job_posts"] if isinstance(x, dict)]
    return []


def list_candidates(access_token: str, *, per_page: int = 50) -> list[dict[str, Any]]:
    data = _get("/candidates", access_token, params={"per_page": str(max(1, min(per_page, 100)))})
    if isinstance(data, list):
        return [x for x in data if isinstance(x, dict)]
    return []


def prepare_candidate_write_payload(
    *,
    application_id: int,
    job_post_id: str | None = None,
) -> dict[str, Any]:
    """Build the payload that *would* be sent to Greenhouse Harvest — no network I/O."""
    return {
        "provider": "greenhouse",
        "endpoint": "POST /candidates",
        "application_id": application_id,
        "job_post_id": job_post_id,
        "ats_write": False,
        "note": "Dry-run stub — live Greenhouse write requires ATS_LIVE_SYNC + Harvest credentials.",
    }


def dry_run_write_candidate(
    access_token: str | None,
    *,
    application_id: int,
    job_post_id: str | None = None,
) -> dict[str, Any]:
    """Dry-run write framework — never mutates Greenhouse; token presence only validated."""
    token_present = bool((access_token or "").strip())
    payload = prepare_candidate_write_payload(
        application_id=application_id,
        job_post_id=job_post_id,
    )
    payload["token_present"] = token_present
    payload["dry_run"] = True
    payload["status"] = "dry_run_ok"
    return payload


def live_write_candidate(
    access_token: str,
    *,
    application_id: int,
    job_post_id: str | None = None,
    allow_live: bool = False,
) -> dict[str, Any]:
    """Live write gate — raises unless ``allow_live`` (caller must check ATS_LIVE_SYNC)."""
    if not allow_live:
        raise ValueError("ats_live_sync_blocked")
    _ = _auth_header(access_token)
    raise ValueError("greenhouse_live_write_not_wired")
