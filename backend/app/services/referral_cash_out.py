"""Referral cash-out request queue (manual payout until Stripe Connect)."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.database.models import ReferralCashOutRequest
from app.services import referral_program as rp

CASH_OUT_STATUS_REQUESTED = "requested"
CASH_OUT_STATUS_PROCESSING = "processing"
OPEN_CASH_OUT_STATUSES = (CASH_OUT_STATUS_REQUESTED, CASH_OUT_STATUS_PROCESSING)

PAYOUT_METHOD_BANK = "bank_transfer"
PAYOUT_METHOD_PAYPAL = "paypal"
ALLOWED_PAYOUT_METHODS = frozenset({PAYOUT_METHOD_BANK, PAYOUT_METHOD_PAYPAL})


def list_cash_out_requests(db: Session, user_id: int, *, limit: int = 50) -> list[ReferralCashOutRequest]:
    return (
        db.query(ReferralCashOutRequest)
        .filter(ReferralCashOutRequest.user_id == user_id)
        .order_by(ReferralCashOutRequest.created_at.desc())
        .limit(limit)
        .all()
    )


def latest_open_cash_out_request(db: Session, user_id: int) -> ReferralCashOutRequest | None:
    return (
        db.query(ReferralCashOutRequest)
        .filter(
            ReferralCashOutRequest.user_id == user_id,
            ReferralCashOutRequest.status.in_(OPEN_CASH_OUT_STATUSES),
        )
        .order_by(ReferralCashOutRequest.created_at.desc())
        .first()
    )


def create_cash_out_request(
    db: Session,
    *,
    user_id: int,
    payout_method: str,
    payout_details: str | None,
) -> ReferralCashOutRequest:
    pending = int(rp.sum_pending_earnings_cents(db, user_id))
    if pending <= 0:
        raise ValueError("no_pending_earnings")
    if latest_open_cash_out_request(db, user_id) is not None:
        raise ValueError("open_request_exists")
    if payout_method not in ALLOWED_PAYOUT_METHODS:
        raise ValueError("invalid_payout_method")

    row = ReferralCashOutRequest(
        user_id=user_id,
        amount_cents=pending,
        payout_method=payout_method,
        payout_details=(payout_details or "").strip()[:500] or None,
        status=CASH_OUT_STATUS_REQUESTED,
    )
    db.add(row)
    db.flush()
    return row
