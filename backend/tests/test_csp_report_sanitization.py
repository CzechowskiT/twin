"""Sanitisation contract for `POST /api/v1/csp-report`.

The CSP report sink at `app/api/csp_reports.py` is storage-free and only
logs a **whitelist** of CSP-spec fields (`document-uri`,
`violated-directive`, etc.). This file freezes that promise: a payload
laced with extras — cookies, headers, page snippets, raw `eval`'d
source — must not surface those extras in the log message.

Why this is its own file and not part of `test_csp_report.py`:

- `test_csp_report.py` covers the **happy path** (legacy + Reporting
  API shapes, empty body, rate limit) and is the load-bearing test.
- This file covers the **abuse / leak path**: what happens when a
  page (or an attacker) tries to use the CSP report endpoint as a
  side-channel to exfiltrate page state into our logs.

Together they bracket the endpoint's full contract. Both are
pure-fixture tests; no DB writes, no network.
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
    """Fresh TestClient with a clean SlowAPI bucket per test."""
    limiter.reset()
    try:
        with TestClient(app) as c:
            yield c
    finally:
        limiter.reset()


# A payload that intentionally laces in fields the spec does NOT define,
# to assert we strip them rather than relay them into the log line.
NOISY_REPORT = {
    "csp-report": {
        "document-uri": "https://app.twin.ai/dashboard",
        "blocked-uri": "https://evil.example.com/x.js",
        "violated-directive": "script-src",
        "effective-directive": "script-src",
        "disposition": "report",
        "status-code": 200,
        # Below: fields a malicious or misbehaving sender might tack on.
        # The sink must drop these — they are NOT part of the CSP-report
        # spec and any of them could leak page state into our logs.
        "cookie": "session=secret-session-token-xyz",
        "authorization": "Bearer some.jwt.value",
        "page-html": "<script>fetch('/admin/keys').then(r=>r.text())</script>",
        "stack-trace": "TypeError: cannot read property 'x' of undefined\n  at exfil()",
        "user-data": {"email": "user@example.com", "ssn": "000-00-0000"},
        "headers": {"x-internal-token": "leak-this-please"},
    }
}


def test_csp_report_logs_only_whitelisted_keys(
    client: TestClient, caplog: pytest.LogCaptureFixture
) -> None:
    """The log line must contain CSP fields and must NOT contain extras.

    The sink is the only public surface that touches our log pipeline
    via a 60/min budget. If the payload's "cookie" or "page-html"
    fields could ride into the structured log, an attacker could
    exfiltrate page state into our log retention. Freeze the
    whitelist behaviour here.
    """
    with caplog.at_level(logging.WARNING, logger="app.api.csp_reports"):
        res = client.post(
            "/api/v1/csp-report",
            content=json.dumps(NOISY_REPORT),
            headers={"content-type": "application/csp-report"},
        )

    assert res.status_code == 204
    joined = " ".join(caplog.messages)

    # Whitelisted fields are surfaced.
    assert "evil.example.com" in joined
    assert "script-src" in joined

    # Non-spec fields must NOT appear in the log.
    forbidden_substrings = [
        "secret-session-token-xyz",
        "some.jwt.value",
        "<script>",
        "exfil()",
        "ssn",
        "000-00-0000",
        "leak-this-please",
        "user@example.com",
    ]
    for needle in forbidden_substrings:
        assert needle not in joined, f"CSP sink leaked unwanted field: {needle!r}"


def test_csp_report_rejects_unknown_reporting_api_types(
    client: TestClient, caplog: pytest.LogCaptureFixture
) -> None:
    """Reporting API entries whose `type != "csp-violation"` are dropped.

    A browser can ship multiple report types in a single POST to the
    Reporting API endpoint (deprecation, intervention, network-error,
    csp-violation). We only opt into CSP today; the rest must not
    surface in our logs.
    """
    payload = [
        {
            "type": "deprecation",
            "body": {"message": "this should NEVER reach our log"},
        },
        {
            "type": "intervention",
            "body": {"sourceFile": "https://intervention.example.com/bad.js"},
        },
        {
            "type": "csp-violation",
            "body": {
                "documentURL": "https://app.twin.ai/dashboard",
                "blockedURL": "https://evil.example.com/y.js",
                "effectiveDirective": "img-src",
                "disposition": "report",
            },
        },
    ]

    with caplog.at_level(logging.WARNING, logger="app.api.csp_reports"):
        res = client.post(
            "/api/v1/csp-report",
            content=json.dumps(payload),
            headers={"content-type": "application/reports+json"},
        )

    assert res.status_code == 204
    joined = " ".join(caplog.messages)
    assert "evil.example.com" in joined
    assert "this should NEVER reach our log" not in joined
    assert "intervention.example.com" not in joined


def test_csp_report_dropped_when_no_csp_envelope(
    client: TestClient, caplog: pytest.LogCaptureFixture
) -> None:
    """A dict payload missing the `csp-report` envelope falls through silently.

    Some misconfigured pages send a bare body (no envelope, no array).
    We accept it but, if it has no recognised CSP fields, we should NOT
    emit a WARNING — only a DEBUG line. This keeps our WARNING-level
    log pipeline noise-free.
    """
    payload = {"not-a-csp-field": "noise", "another": {"nested": True}}

    with caplog.at_level(logging.WARNING, logger="app.api.csp_reports"):
        res = client.post(
            "/api/v1/csp-report",
            content=json.dumps(payload),
            headers={"content-type": "application/csp-report"},
        )

    assert res.status_code == 204
    # The WARNING-level pipeline must stay clean for shapeless payloads.
    warnings = [r for r in caplog.records if r.levelno >= logging.WARNING]
    assert warnings == [], [r.message for r in warnings]


def test_csp_report_summary_drops_blank_values(
    client: TestClient, caplog: pytest.LogCaptureFixture
) -> None:
    """Empty / None values in whitelisted fields are not logged.

    The summary builder filters out `None` and `""`. This means a
    page that posts `{"document-uri": ""}` doesn't end up with a
    bogus empty entry in the log dict — keeps log noise / parse
    burden down for whoever follows up on CSP violations.
    """
    payload = {
        "csp-report": {
            "document-uri": "",
            "blocked-uri": None,
            "violated-directive": "img-src",
            "effective-directive": "img-src",
        }
    }
    with caplog.at_level(logging.WARNING, logger="app.api.csp_reports"):
        res = client.post(
            "/api/v1/csp-report",
            content=json.dumps(payload),
            headers={"content-type": "application/csp-report"},
        )

    assert res.status_code == 204
    joined = " ".join(caplog.messages)
    # The non-blank field is logged…
    assert "img-src" in joined
    # …but the blank fields don't leave a misleading "key=''" / "key=None"
    # artefact in the log dict's repr.
    assert "document-uri': ''" not in joined
    assert "blocked-uri': None" not in joined
