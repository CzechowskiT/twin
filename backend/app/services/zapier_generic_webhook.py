"""Zapier-compatible generic signed webhook — no Marketplace listing required."""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
import secrets
import time
from datetime import datetime, timezone
from typing import Any
from sqlalchemy.orm import Session

from app.database.models import (
    ConnectorTestReceiverEvent,
    ConnectorWebhookSubscription,
    WebhookDeliveryAttempt,
)
from app.services.token_crypto import decrypt_secret, encrypt_secret

logger = logging.getLogger(__name__)

MAX_RETRIES = 3
INTERNAL_RECEIVER_PATH = "/api/v1/platform/wave5/connectors/test-receiver"


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _hash_secret(secret: str) -> str:
    return hashlib.sha256(secret.encode("utf-8")).hexdigest()


def _sign(secret: str, body: bytes) -> str:
    return hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()


def _validate_target_url(url: str, *, public_api_base: str | None = None) -> str:
    from app.services.url_safety import assert_public_https_url

    allow: tuple[str, ...] = ()
    if public_api_base and public_api_base.startswith("https://"):
        allow = (public_api_base.rstrip("/") + INTERNAL_RECEIVER_PATH,)
    return assert_public_https_url(url, allow_localhost_prefixes=allow)


def zapier_status(*, public_api_base: str | None = None) -> dict[str, Any]:
    receiver = None
    if public_api_base and public_api_base.startswith("https://"):
        receiver = public_api_base.rstrip("/") + INTERNAL_RECEIVER_PATH
    return {
        "connector": "zapier",
        "status": "READY",
        "blocker": None,
        "reason": "Generic signed webhook LIVE (no Zapier Marketplace)",
        "delivery": True,
        "marketplace_required": False,
        "internal_receiver_url": receiver,
        "capabilities": {
            "CONFIGURATION": "LIVE",
            "WEBHOOK": "LIVE",
            "DRAFT": "LIVE",
            "MONITORING": "LIVE",
        },
    }


def create_subscription(
    db: Session,
    *,
    user_id: int,
    target_url: str,
    event_filter: str | None = None,
    public_api_base: str | None = None,
) -> dict[str, Any]:
    url = _validate_target_url(target_url, public_api_base=public_api_base)
    secret = secrets.token_urlsafe(32)
    # secret_hash stores HMAC verify material; encrypt_secret holds plaintext for delivery.
    enc = encrypt_secret(secret)
    row = ConnectorWebhookSubscription(
        user_id=user_id,
        provider="zapier",
        target_url=url,
        secret_hash=enc or _hash_secret(secret),
        secret_prefix=secret[:8],
        event_filter=(event_filter or "twin.connector.test")[:128],
        status="active",
        payload_version="v1",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {
        "ok": True,
        "subscription_id": row.id,
        "target_url": row.target_url,
        "secret": secret,
        "secret_prefix": row.secret_prefix,
        "event_filter": row.event_filter,
        "status": row.status,
        "payload_version": row.payload_version,
    }


def _load_secret(row: ConnectorWebhookSubscription) -> str | None:
    return decrypt_secret(row.secret_hash)


def rotate_secret(db: Session, *, user_id: int, subscription_id: int) -> dict[str, Any]:
    row = _owned_active(db, user_id=user_id, subscription_id=subscription_id)
    secret = secrets.token_urlsafe(32)
    row.secret_hash = encrypt_secret(secret) or _hash_secret(secret)
    row.secret_prefix = secret[:8]
    row.updated_at = _utcnow()
    db.commit()
    return {
        "ok": True,
        "subscription_id": row.id,
        "secret": secret,
        "secret_prefix": row.secret_prefix,
    }


def revoke_subscription(db: Session, *, user_id: int, subscription_id: int) -> dict[str, Any]:
    row = (
        db.query(ConnectorWebhookSubscription)
        .filter(
            ConnectorWebhookSubscription.id == subscription_id,
            ConnectorWebhookSubscription.user_id == user_id,
        )
        .one_or_none()
    )
    if row is None:
        raise ValueError("subscription_not_found")
    row.status = "revoked"
    row.revoked_at = _utcnow()
    db.commit()
    return {"ok": True, "subscription_id": row.id, "status": "revoked"}


def _owned_active(
    db: Session, *, user_id: int, subscription_id: int
) -> ConnectorWebhookSubscription:
    row = (
        db.query(ConnectorWebhookSubscription)
        .filter(
            ConnectorWebhookSubscription.id == subscription_id,
            ConnectorWebhookSubscription.user_id == user_id,
            ConnectorWebhookSubscription.status == "active",
        )
        .one_or_none()
    )
    if row is None:
        raise ValueError("subscription_not_found_or_revoked")
    return row


def deliver_test_event(
    db: Session,
    *,
    user_id: int,
    subscription_id: int,
    force_fail: bool = False,
) -> dict[str, Any]:
    """Sign + POST synthetic event; retries with exponential backoff on failure."""
    row = _owned_active(db, user_id=user_id, subscription_id=subscription_id)
    secret = _load_secret(row)
    if not secret:
        raise ValueError("secret_unavailable")
    event_id = f"evt_{secrets.token_hex(12)}"
    payload = {
        "id": event_id,
        "version": row.payload_version,
        "type": row.event_filter or "twin.connector.test",
        "provider": "zapier",
        "subscription_id": row.id,
        "ts": int(time.time()),
        "data": {"smoke": True, "message": "twin_zapier_generic_test"},
    }
    body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    signature = _sign(secret, body)
    last_status = 0
    attempt_n = 0
    ok = False
    for attempt_n in range(1, MAX_RETRIES + 1):
        if force_fail and attempt_n == 1:
            last_status = 503
            _ledger(
                db,
                event_type="zapier.test_event",
                idempotency_key=f"{event_id}:a{attempt_n}",
                signature_ok=True,
                status="retry",
                http_status=503,
                attempt_n=attempt_n,
                error_code="forced_fail",
            )
            time.sleep(0.05 * (2 ** (attempt_n - 1)))
            continue
        try:
            import httpx

            with httpx.Client(timeout=15.0, follow_redirects=False) as client:
                res = client.post(
                    row.target_url,
                    content=body,
                    headers={
                        "Content-Type": "application/json",
                        "X-Twin-Signature": signature,
                        "X-Twin-Event-Id": event_id,
                        "X-Twin-Subscription-Id": str(row.id),
                    },
                )
            last_status = res.status_code
            if 200 <= res.status_code < 300:
                ok = True
                _ledger(
                    db,
                    event_type="zapier.test_event",
                    idempotency_key=f"{event_id}:a{attempt_n}",
                    signature_ok=True,
                    status="delivered",
                    http_status=res.status_code,
                    attempt_n=attempt_n,
                    error_code=None,
                )
                break
            _ledger(
                db,
                event_type="zapier.test_event",
                idempotency_key=f"{event_id}:a{attempt_n}",
                signature_ok=True,
                status="retry" if attempt_n < MAX_RETRIES else "dead_letter",
                http_status=res.status_code,
                attempt_n=attempt_n,
                error_code=f"http_{res.status_code}",
            )
        except Exception as exc:
            logger.warning("zapier deliver failed attempt=%s err=%s", attempt_n, type(exc).__name__)
            last_status = 0
            _ledger(
                db,
                event_type="zapier.test_event",
                idempotency_key=f"{event_id}:a{attempt_n}",
                signature_ok=True,
                status="retry" if attempt_n < MAX_RETRIES else "dead_letter",
                http_status=None,
                attempt_n=attempt_n,
                error_code="transport_error",
            )
        time.sleep(0.05 * (2 ** (attempt_n - 1)))
    if ok:
        row.last_delivery_at = _utcnow()
        db.commit()
    return {
        "ok": ok,
        "event_id": event_id,
        "http_status": last_status,
        "attempts": attempt_n,
        "subscription_id": row.id,
        "dead_letter": not ok,
    }


def receive_test_event(
    db: Session,
    *,
    raw_body: bytes,
    signature: str | None,
    event_id: str | None,
    subscription_id: int | None,
) -> dict[str, Any]:
    """Internal receiver — validates HMAC via encrypted subscription secret."""
    eid = (event_id or "").strip() or f"anon_{secrets.token_hex(8)}"
    prior = (
        db.query(ConnectorTestReceiverEvent)
        .filter(ConnectorTestReceiverEvent.event_id == eid)
        .one_or_none()
    )
    if prior is not None:
        return {"ok": False, "status": "replay_rejected", "event_id": eid, "http_status": 409}

    sig_ok = False
    if subscription_id and signature:
        sub = (
            db.query(ConnectorWebhookSubscription)
            .filter(
                ConnectorWebhookSubscription.id == subscription_id,
                ConnectorWebhookSubscription.status == "active",
            )
            .one_or_none()
        )
        if sub is not None:
            secret = _load_secret(sub)
            if secret:
                expected = _sign(secret, raw_body)
                sig_ok = hmac.compare_digest(expected, signature.strip().lower())

    status = "received" if sig_ok else "signature_invalid"
    db.add(
        ConnectorTestReceiverEvent(
            subscription_id=subscription_id,
            event_id=eid,
            provider="zapier",
            signature_ok=sig_ok,
            replay_rejected=False,
            status=status,
            meta_json=json.dumps({"bytes": len(raw_body), "has_sig": bool(signature)}),
        )
    )
    db.commit()
    return {
        "ok": sig_ok,
        "status": status,
        "event_id": eid,
        "http_status": 200 if sig_ok else 401,
    }


def _ledger(
    db: Session,
    *,
    event_type: str,
    idempotency_key: str,
    signature_ok: bool,
    status: str,
    http_status: int | None,
    attempt_n: int,
    error_code: str | None,
) -> None:
    db.add(
        WebhookDeliveryAttempt(
            provider="zapier",
            direction="outbound",
            event_type=event_type,
            idempotency_key=idempotency_key,
            signature_ok=signature_ok,
            replay_rejected=False,
            status=status,
            http_status=http_status,
            attempt_n=attempt_n,
            error_code=error_code,
            meta_json=json.dumps({"generic_webhook": True}),
        )
    )
    db.commit()
