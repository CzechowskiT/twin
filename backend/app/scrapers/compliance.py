"""Scraping politeness: identifiable User-Agent and optional robots.txt checks.

Operators remain responsible for each job board's Terms of Use and for data
licences. This module encodes *technical* good-faith defaults (who we claim to
be, whether we honour robots.txt, pacing between boards).
"""

from __future__ import annotations

import logging
import time
from urllib.parse import urlparse
from urllib.robotparser import RobotFileParser

from app.config import get_settings

logger = logging.getLogger(__name__)

_ROBOTS_CACHE: dict[str, tuple[float, RobotFileParser | None]] = {}
_ROBOTS_TTL_SEC = 3600.0


def get_scrape_user_agent() -> str:
    """Browser-like UA plus a machine-readable TWIN contact URL (RFC 9309 style)."""
    s = get_settings()
    base = (s.frontend_url or "http://localhost:3000").strip().rstrip("/")
    chrome = (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    )
    return f"{chrome} (TWIN-CareerAgent/1.0; +{base}/privacy)"


def _robots_parser_for_netloc(scheme: str, netloc: str) -> RobotFileParser | None:
    key = f"{scheme}://{netloc}".lower()
    now = time.time()
    cached = _ROBOTS_CACHE.get(key)
    if cached and now - cached[0] < _ROBOTS_TTL_SEC:
        return cached[1]

    robots_url = f"{scheme}://{netloc}/robots.txt"
    rp = RobotFileParser()
    try:
        rp.set_url(robots_url)
        rp.read()
        _ROBOTS_CACHE[key] = (now, rp)
        return rp
    except Exception as exc:
        logger.warning("Could not read robots.txt from %s (%s)", robots_url, exc)
        _ROBOTS_CACHE[key] = (now, None)
        return None


def robots_allows_url(url: str, user_agent: str, *, respect_robots: bool) -> bool:
    """Return True if we may fetch ``url`` for this user-agent per robots.txt (or policy off)."""
    if not respect_robots:
        return True
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        return False

    rp = _robots_parser_for_netloc(parsed.scheme, parsed.netloc)
    if rp is None:
        logger.info(
            "robots.txt missing or unreadable for %s — allowing fetch (set SCRAPE_RESPECT_ROBOTS_TXT=false to skip checks entirely)",
            parsed.netloc,
        )
        return True
    try:
        allowed = rp.can_fetch(user_agent, url)
    except Exception as exc:
        logger.warning("robots can_fetch failed for %s: %s", url, exc)
        return True
    if not allowed:
        logger.info("robots.txt disallows fetch: %s", url)
    return allowed


def assert_url_may_be_fetched(url: str) -> bool:
    """Gate a single HTTP(S) fetch; honours ``Settings.scrape_respect_robots_txt``."""
    s = get_settings()
    ua = get_scrape_user_agent()
    return robots_allows_url(url, ua, respect_robots=s.scrape_respect_robots_txt)


def sleep_between_boards() -> None:
    """Serial scrape-all pacing to reduce burst load on third-party sites."""
    delay = float(get_settings().scrape_between_boards_sec)
    if delay > 0:
        time.sleep(delay)


def post_fetch_delay() -> None:
    """Optional per-request throttle after a Playwright session (default 0)."""
    delay = float(get_settings().scrape_post_fetch_delay_sec)
    if delay > 0:
        time.sleep(delay)
