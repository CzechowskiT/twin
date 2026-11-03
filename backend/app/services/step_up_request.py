"""Shared helpers for Epic 2.23 step-up header consumption."""

from __future__ import annotations

from fastapi import Request


STEP_UP_HEADER = "X-Twin-Step-Up"


def step_up_token_from_request(request: Request) -> str | None:
    raw = request.headers.get(STEP_UP_HEADER) or request.headers.get("x-twin-step-up")
    if not raw:
        return None
    token = raw.strip()
    return token or None


def session_binding_from_request(request: Request) -> tuple[str | None, int | None]:
    sid = getattr(request.state, "session_key", None)
    epoch = getattr(request.state, "session_epoch", None)
    return sid, epoch
