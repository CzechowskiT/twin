"""Contract test for `POST /api/v1/csp-report`.

Browsers send CSP violation reports fire-and-forget, in one of two
legacy/modern shapes. The endpoint must:

- always return 204 (so a bad report never appears as a console error
  on the user's page),
- log the violation when the payload is well-formed,
- not persist anything to the DB,
- rate-limit per-IP (defence against a misconfigured page or a bot
  flooding the log pipeline).
"""

from __future__ import annotations

import json
import logging
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from app.limiter import limiter
from app.main import app


@pytest.fixture
def client() -> Iterator[TestClient]:
    limiter.reset()
    try:
        with TestClient(app) as c:
            yield c
    finally:
        limiter.reset()


LEGACY_REPORT = {
    "csp-report": {
        "document-uri": "https://app.twin.ai/dashboard",
        "blocked-uri": "https://evil.example.com/x.js",
        "violated-directive": "script-src",
        "effective-directive": "script-src",
        "disposition": "report",
        "status-code": 200,
        "line-number": 12,
    }
}

REPORTING_API_REPORT = [
    {
        "type": "csp-violation",
        "age": 0,
        "url": "https://app.twin.ai/dashboard",
        "body": {
            "documentURL": "https://app.twin.ai/dashboard",
            "blockedURL": "https://evil.example.com/x.js",
            "effectiveDirective": "script-src-elem",
            "disposition": "report",
            "statusCode": 200,
            "lineNumber": 12,
            "columnNumber": 4,
        },
    }
]


def test_csp_report_accepts_legacy_envelope_and_logs(
    client: TestClient, caplog: pytest.LogCaptureFixture
) -> None:
    """Legacy `application/csp-report` payload → 204 and a structured log line."""
    with caplog.at_level(logging.WARNING, logger="app.api.csp_reports"):
        res = client.post(
            "/api/v1/csp-report",
            content=json.dumps(LEGACY_REPORT),
            headers={"content-type": "application/csp-report"},
        )

    assert res.status_code == 204
    assert res.content == b""
    assert any("evil.example.com" in m for m in caplog.messages), caplog.messages


def test_csp_report_accepts_reporting_api_array(
    client: TestClient, caplog: pytest.LogCaptureFixture
) -> None:
    """Modern `application/reports+json` array payload → 204 and logged."""
    with caplog.at_level(logging.WARNING, logger="app.api.csp_reports"):
        res = client.post(
            "/api/v1/csp-report",
            content=json.dumps(REPORTING_API_REPORT),
            headers={"content-type": "application/reports+json"},
        )

    assert res.status_code == 204
    assert any("evil.example.com" in m for m in caplog.messages), caplog.messages


def test_csp_report_accepts_empty_body_silently(client: TestClient) -> None:
    """Some browsers POST an empty body on policy clear — still 204."""
    res = client.post("/api/v1/csp-report", content=b"")
    assert res.status_code == 204


def test_csp_report_accepts_garbled_payload_silently(client: TestClient) -> None:
    """Undecodable JSON → still 204 (never give the browser a reason to retry)."""
    res = client.post(
        "/api/v1/csp-report",
        content=b"\xff\xfe\x00not-json",
        headers={"content-type": "application/csp-report"},
    )
    assert res.status_code == 204


def test_csp_report_is_rate_limited_after_60_per_minute(client: TestClient) -> None:
    """60/min cap protects the log pipeline from a flood."""
    codes = []
    for _ in range(61):
        r = client.post(
            "/api/v1/csp-report",
            content=json.dumps(LEGACY_REPORT),
            headers={"content-type": "application/csp-report"},
        )
        codes.append(r.status_code)
    assert codes[:60] == [204] * 60
    assert codes[60] == 429
