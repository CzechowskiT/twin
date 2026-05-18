"""Public Greenhouse Jobs API — JSON listings (no Playwright)."""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.scrapers import compliance
from app.scrapers.base import ScrapedJob, validate_job

logger = logging.getLogger(__name__)

_GREENHOUSE_JOBS_URL = "https://boards-api.greenhouse.io/v1/boards/{token}/jobs"


def scrape_greenhouse_board(token: str, company_label: str, *, limit: int) -> list[ScrapedJob]:
    """Fetch open roles for a single Greenhouse board token (e.g. ``stripe``)."""
    url = _GREENHOUSE_JOBS_URL.format(token=token)
    if not compliance.assert_url_may_be_fetched(url):
        return []
    try:
        with httpx.Client(timeout=30.0) as client:
            resp = client.get(url, headers={"User-Agent": compliance.get_scrape_user_agent()})
            resp.raise_for_status()
            payload = resp.json()
    except (httpx.HTTPError, ValueError, TypeError) as exc:
        logger.info("Greenhouse fetch failed token=%s: %s", token, exc)
        return []

    jobs_raw = payload.get("jobs") if isinstance(payload, dict) else None
    if not isinstance(jobs_raw, list):
        return []

    out: list[ScrapedJob] = []
    for item in jobs_raw:
        if len(out) >= limit:
            break
        job = _to_scraped(item, token=token, company_label=company_label)
        if job and validate_job(job):
            out.append(job)
    return out


def _to_scraped(item: Any, *, token: str, company_label: str) -> ScrapedJob | None:
    if not isinstance(item, dict):
        return None
    jid = item.get("id")
    title = (item.get("title") or "").strip()
    url = (item.get("absolute_url") or "").strip()
    if jid is None or not title or not url:
        return None
    ext = f"{token}-{jid}"
    loc = item.get("location")
    location: str | None = None
    if isinstance(loc, dict):
        location = (loc.get("name") or "").strip() or None
    return ScrapedJob(
        job_board=f"greenhouse:{token}",
        external_id=ext[:120],
        title=title,
        company=company_label.strip() or token,
        url=url,
        location=location,
    )
