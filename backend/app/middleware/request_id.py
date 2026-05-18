"""Attach a stable request id for logs and client correlation (X-Request-ID)."""

from __future__ import annotations

import uuid
from collections.abc import Awaitable, Callable

from fastapi import FastAPI
from starlette.requests import Request
from starlette.responses import Response


def _normalize_incoming_request_id(raw: str | None) -> str | None:
    if not raw:
        return None
    s = raw.strip()
    if len(s) < 8 or len(s) > 128:
        return None
    if not all(32 <= ord(c) < 127 for c in s):
        return None
    return s


def add_request_id_middleware(app: FastAPI) -> None:
    @app.middleware("http")
    async def _request_id_middleware(
        request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        incoming = _normalize_incoming_request_id(request.headers.get("x-request-id"))
        rid = incoming or str(uuid.uuid4())
        request.state.request_id = rid
        response = await call_next(request)
        response.headers["X-Request-ID"] = rid
        return response
