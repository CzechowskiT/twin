"""Account referral ledger: value-aligned bonuses (first payment, retention, hire) + tier milestones."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import Settings
from app.database.models import AccountReferral, Candidate, ReferralPayout, User

logger = logging.getLogger(__name__)

PAYOUT_FIRST_PAYMENT = "first_payment"
PAYOUT_RETAINED_3M = "retained_3m"
PAYOUT_HIRED = "hired"
PAYOUT_MILESTONE_10 = "milestone_10"
PAYOUT_MILESTONE_50 = "milestone_50"
PAYOUT_MILESTONE_100 = "milestone_100"

STATUS_PENDING = "pending"
STATUS_VOID = "void"


def record_account_referral_edge(
    db: Session,
    *,
    referrer_user_id: int,
    referred_user_id: int,
    ref_code_used: str | None,
    utm_source: str | None,
    utm_medium: str | None,
    utm_campaign: str | None,
    utm_content: str | None,
) -> AccountReferral | None:
    """Create referral edge once per referred user; skip self-referrals."""
    if referrer_user_id == referred_user_id:
        return None
    if (
        db.query(AccountReferral.id)
        .filter(AccountReferral.referred_user_id == referred_user_id)
        .first()
    ):
        return None
    row = AccountReferral(
        referrer_user_id=referrer_user_id,
        referred_user_id=referred_user_id,
        ref_code_used=ref_code_used,
        utm_source=utm_source,
        utm_medium=utm_medium,
        utm_campaign=utm_campaign,
        utm_content=utm_content,
        created_at=datetime.now(timezone.utc),
    )
    db.add(row)
    return row


def _payout_exists(
    db: Session,
    *,
    referral_id: int | None,
    referrer_user_id: int,
    payout_type: str,
) -> bool:
    q = db.query(ReferralPayout.id).filter(
        ReferralPayout.referrer_user_id == referrer_user_id,
        ReferralPayout.payout_type == payout_type,
        ReferralPayout.status != STATUS_VOID,
    )
    if referral_id is None:
        q = q.filter(ReferralPayout.referral_id.is_(None))
    else:
        q = q.filter(ReferralPayout.referral_id == referral_id)
    return q.first() is not None


def _insert_payout(
    db: Session,
    *,
    referral_id: int | None,
    referrer_user_id: int,
    payout_type: str,
    amount_cents: int,
) -> None:
    if amount_cents <= 0:
        return
    db.add(
        ReferralPayout(
            referral_id=referral_id,
            referrer_user_id=referrer_user_id,
            payout_type=payout_type,
            amount_cents=amount_cents,
            status=STATUS_PENDING,
            created_at=datetime.now(timezone.utc),
        )
    )


def count_first_payment_qualified_referrals(db: Session, referrer_user_id: int) -> int:
    """Distinct referred users with a non-void first_payment payout."""
    n = (
        db.query(func.count(func.distinct(AccountReferral.id)))
        .select_from(AccountReferral)
        .join(ReferralPayout, ReferralPayout.referral_id == AccountReferral.id)
        .filter(
            AccountReferral.referrer_user_id == referrer_user_id,
            ReferralPayout.payout_type == PAYOUT_FIRST_PAYMENT,
            ReferralPayout.status != STATUS_VOID,
        )
        .scalar()
    )
    return int(n or 0)


def referral_tier_for_qualified_count(n: int) -> str:
    if n >= 100:
        return "legend"
    if n >= 50:
        return "ambassador"
    if n >= 10:
        return "advocate"
    return "starter"


def maybe_grant_milestone_payouts(db: Session, referrer_user_id: int, settings: Settings) -> None:
    n = count_first_payment_qualified_referrals(db, referrer_user_id)
    milestones = [
        (10, PAYOUT_MILESTONE_10, int(settings.referral_milestone_10_cents)),
        (50, PAYOUT_MILESTONE_50, int(settings.referral_milestone_50_cents)),
        (100, PAYOUT_MILESTONE_100, int(settings.referral_milestone_100_cents)),
    ]
    for threshold, typ, cents in milestones:
        if n >= threshold and not _payout_exists(db, referral_id=None, referrer_user_id=referrer_user_id, payout_type=typ):
            _insert_payout(db, referral_id=None, referrer_user_id=referrer_user_id, payout_type=typ, amount_cents=cents)


def on_subscription_invoice_paid(db: Session, user: User, settings: Settings) -> None:
    """Stripe subscription invoice paid — count periods and unlock referral bonuses for this user's referrer."""
    edge = (
        db.query(AccountReferral)
        .filter(AccountReferral.referred_user_id == user.id)
        .first()
    )
    if not edge:
        return
    user.subscription_invoice_payment_count = int(user.subscription_invoice_payment_count or 0) + 1
    rid = edge.referrer_user_id
    ref_id = int(edge.id)

    if user.subscription_invoice_payment_count == 1:
        if not _payout_exists(db, referral_id=ref_id, referrer_user_id=rid, payout_type=PAYOUT_FIRST_PAYMENT):
            _insert_payout(
                db,
                referral_id=ref_id,
                referrer_user_id=rid,
                payout_type=PAYOUT_FIRST_PAYMENT,
                amount_cents=int(settings.referral_bonus_first_payment_cents),
            )
            db.flush()
            maybe_grant_milestone_payouts(db, rid, settings)

    if user.subscription_invoice_payment_count >= 3:
        if not _payout_exists(db, referral_id=ref_id, referrer_user_id=rid, payout_type=PAYOUT_RETAINED_3M):
            _insert_payout(
                db,
                referral_id=ref_id,
                referrer_user_id=rid,
                payout_type=PAYOUT_RETAINED_3M,
                amount_cents=int(settings.referral_bonus_retained_3m_cents),
            )


def on_referred_user_hired(db: Session, referred_user_id: int, settings: Settings) -> None:
    """Application moved to hired for referred user's candidate — one-time hire bonus for referrer."""
    edge = (
        db.query(AccountReferral)
        .filter(AccountReferral.referred_user_id == referred_user_id)
        .first()
    )
    if not edge:
        return
    ref_id = int(edge.id)
    rid = edge.referrer_user_id
    if not _payout_exists(db, referral_id=ref_id, referrer_user_id=rid, payout_type=PAYOUT_HIRED):
        _insert_payout(
            db,
            referral_id=ref_id,
            referrer_user_id=rid,
            payout_type=PAYOUT_HIRED,
            amount_cents=int(settings.referral_bonus_hired_cents),
        )


def sum_pending_earnings_cents(db: Session, referrer_user_id: int) -> int:
    q = (
        db.query(func.coalesce(func.sum(ReferralPayout.amount_cents), 0))
        .filter(
            ReferralPayout.referrer_user_id == referrer_user_id,
            ReferralPayout.status == STATUS_PENDING,
        )
        .scalar()
    )
    return int(q or 0)


def sum_all_earnings_cents(db: Session, referrer_user_id: int) -> int:
    q = (
        db.query(func.coalesce(func.sum(ReferralPayout.amount_cents), 0))
        .filter(
            ReferralPayout.referrer_user_id == referrer_user_id,
            ReferralPayout.status != STATUS_VOID,
        )
        .scalar()
    )
    return int(q or 0)


def leaderboard_rows(db: Session, *, window: str, limit: int = 30) -> list[dict[str, object]]:
    """Aggregate pending+approved+paid earnings; ``window`` is ``month`` or ``all``."""
    q = (
        db.query(
            ReferralPayout.referrer_user_id,
            func.sum(ReferralPayout.amount_cents).label("total_cents"),
        )
        .filter(ReferralPayout.status != STATUS_VOID)
    )
    if window == "month":
        now = datetime.now(timezone.utc)
        start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
        q = q.filter(ReferralPayout.created_at >= start)
    rows = (
        q.group_by(ReferralPayout.referrer_user_id)
        .order_by(func.sum(ReferralPayout.amount_cents).desc())
        .limit(limit)
        .all()
    )
    out: list[dict[str, object]] = []
    rank = 0
    for uid, cents in rows:
        rank += 1
        u = db.query(User).filter(User.id == uid).first()
        cand = db.query(Candidate).filter(Candidate.user_id == uid).first() if u else None
        name = _public_display_name(cand.name if cand else None, u.email if u else "?")
        nq = count_first_payment_qualified_referrals(db, int(uid))
        out.append(
            {
                "rank": rank,
                "referrer_user_id": int(uid),
                "display_name": name,
                "referral_tier": referral_tier_for_qualified_count(nq),
                "qualified_referrals": nq,
                "earnings_cents": int(cents or 0),
            }
        )
    return out


def _public_display_name(full_name: str | None, email: str) -> str:
    if full_name and str(full_name).strip():
        parts = str(full_name).strip().split()
        if len(parts) == 1:
            return parts[0]
        return f"{parts[0]} {parts[-1][0]}."
    local = email.split("@")[0]
    return local[:2].upper() + "…" if len(local) > 2 else local


def preview_referrer(db: Session, code: str, settings: Settings) -> dict[str, str] | None:
    code = code.strip()
    if not code or len(code) > 128:
        return None
    u = db.query(User).filter(User.referral_public_token == code, User.is_active.is_(True)).first()
    if not u:
        return None
    cand = db.query(Candidate).filter(Candidate.user_id == u.id).first()
    n = count_first_payment_qualified_referrals(db, u.id)
    return {
        "display_name": _public_display_name(cand.name if cand else None, u.email),
        "referral_tier": referral_tier_for_qualified_count(n),
    }
