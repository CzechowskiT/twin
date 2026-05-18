"""Persisted idempotency for mutating API routes (safe retries)."""

from __future__ import annotations

import hashlib
import json
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.database.models import ApiIdempotency


def _body_fingerprint(payload: dict[str, Any]) -> str:
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def normalize_idempotency_key(raw: str | None) -> str | None:
    if not raw:
        return None
    s = raw.strip()
    if len(s) < 8 or len(s) > 128:
        return None
    if not all(c.isalnum() or c in "-_" for c in s):
        return None
    return s


def try_replay_idempotent(
    db: Session,
    *,
    user_id: int,
    scope: str,
    idempotency_key: str,
    body: dict[str, Any],
) -> tuple[int, str] | None:
    """Return (status_code, json_body) to replay, or None if this is the first attempt."""
    fp = _body_fingerprint(body)
    row = (
        db.query(ApiIdempotency)
        .filter(
            ApiIdempotency.user_id == user_id,
            ApiIdempotency.scope == scope,
            ApiIdempotency.idempotency_key == idempotency_key,
        )
        .first()
    )
    if not row:
        return None
    if row.body_fingerprint != fp:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Idempotency-Key reused with a different request body.",
        )
    return (row.response_status, row.response_json)


def store_idempotent_response(
    db: Session,
    *,
    user_id: int,
    scope: str,
    idempotency_key: str,
    body: dict[str, Any],
    response_status: int,
    response_json: str,
) -> None:
    fp = _body_fingerprint(body)
    row = ApiIdempotency(
        user_id=user_id,
        scope=scope,
        idempotency_key=idempotency_key,
        body_fingerprint=fp,
        response_status=response_status,
        response_json=response_json,
    )
    db.add(row)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
