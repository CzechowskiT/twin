"""CSP violation report sink.

Receives `POST /api/v1/csp-report` from browsers running our
`Content-Security-Policy[-Report-Only]` header. Used during the
report-only burn-in described in
`docs/P1_CSP_ENFORCEMENT_PLAN_2026-05-27.md` to discover which
hosts our pages still need before we can flip the header from
`-Report-Only` to enforcing mode.

This endpoint is intentionally **storage-free**:

- Browsers can POST one of two payload shapes (legacy
  `application/csp-report` envelope or the modern Reporting API's
  `application/reports+json`). We parse leniently and log a
  structured message; no DB write, no PII persistence, no
  migration.
- Rate-limited per IP so a misconfigured page (or a bot) cannot
  flood the logs.
- Returns `204 No Content` per the W3C CSP3 spec recommendation.
"""

from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import APIRouter, Request, Response, status

from app.limiter import limiter

logger = logging.getLogger(__name__)

router = APIRouter()

_REPORT_LOG_KEYS = (
    "document-uri",
    "documentURL",
    "blocked-uri",
    "blockedURL",
    "violated-directive",
    "effectiveDirective",
    "effective-directive",
    "disposition",
    "source-file",
    "sourceFile",
    "status-code",
    "line-number",
    "lineNumber",
    "column-number",
    "columnNumber",
)


def _summarise_report(payload: dict[str, Any] | list[dict[str, Any]]) -> dict[str, Any]:
    """Pull the report's key fields into a flat dict that's safe to log.

    Accepts both the legacy `{"csp-report": {...}}` envelope and the
    Reporting API's `[{"type": "csp-violation", "body": {...}}]` array.
    Everything outside the documented CSP report fields is dropped so
    we don't accidentally persist headers, cookies, or page snippets.
    """
    bodies: list[dict[str, Any]] = []
    if isinstance(payload, list):
        for entry in payload:
            if not isinstance(entry, dict):
                continue
            if entry.get("type") not in (None, "csp-violation"):
                continue
            body = entry.get("body")
            if isinstance(body, dict):
                bodies.append(body)
    elif isinstance(payload, dict):
        envelope = payload.get("csp-report")
        bodies.append(envelope if isinstance(envelope, dict) else payload)

    if not bodies:
        return {}
    body = bodies[0]
    summary: dict[str, Any] = {}
    for key in _REPORT_LOG_KEYS:
        if key in body and body[key] not in (None, ""):
            summary[key] = body[key]
    return summary


@router.post("/csp-report", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("60/minute")
async def csp_report(request: Request) -> Response:
    """Accept a CSP violation report and log it. Always returns 204.

    Browsers send these fire-and-forget; we never want to fail closed
    here because a 4xx/5xx would drop the report on the floor without
    giving us anything to investigate. Bad payloads are logged at
    DEBUG and acknowledged.
    """
    raw = await request.body()
    if not raw:
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    try:
        payload = json.loads(raw.decode("utf-8", errors="replace"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        logger.debug("csp_report: undecodable payload, %d bytes", len(raw))
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    summary = _summarise_report(payload)
    if summary:
        logger.warning("csp_report violation: %s", summary)
    else:
        logger.debug("csp_report: empty or unrecognised payload shape")

    return Response(status_code=status.HTTP_204_NO_CONTENT)
