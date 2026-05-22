"""Account referral program: preview (signup), dashboard summary, leaderboard."""

from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.core.deps import get_current_user
from app.database.models import AccountReferral, ReferralPayout, User
from app.database.session import get_db
from app.schemas.referral import (
    ReferralCashOutHistoryOut,
    ReferralCashOutRequestIn,
    ReferralCashOutRequestOut,
    ReferralLeaderboardEntryOut,
    ReferralLeaderboardOut,
    ReferralMeOut,
    ReferralPayoutOut,
    ReferralPreviewOut,
)
from app.services import referral_cash_out as rco
from app.services import referral_program as rp
from app.services.referral_public_token import ensure_user_referral_public_token

router = APIRouter()


@router.get("/preview", response_model=ReferralPreviewOut)
def preview_referrer_public(
    code: str = Query(..., min_length=4, max_length=128),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> ReferralPreviewOut:
    data = rp.preview_referrer(db, code, settings)
    if not data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown referral code.")
    return ReferralPreviewOut.model_validate(data)


@router.get("/me", response_model=ReferralMeOut)
def referral_me(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> ReferralMeOut:
    token = ensure_user_referral_public_token(db, user)
    db.commit()
    db.refresh(user)

    n_qual = rp.count_first_payment_qualified_referrals(db, user.id)
    tier = rp.referral_tier_for_qualified_count(n_qual)
    edges = (
        db.query(func.count(AccountReferral.id))
        .filter(AccountReferral.referrer_user_id == user.id)
        .scalar()
        or 0
    )
    recent = (
        db.query(ReferralPayout)
        .filter(ReferralPayout.referrer_user_id == user.id)
        .order_by(ReferralPayout.created_at.desc())
        .limit(25)
        .all()
    )
    share_path = f"/register?ref={quote(token, safe='')}"
    return ReferralMeOut(
        referral_public_token=token,
        share_example_path=share_path,
        referral_tier=tier,
        qualified_referrals=n_qual,
        referred_user_count=int(edges),
        pending_earnings_cents=rp.sum_pending_earnings_cents(db, user.id),
        lifetime_earnings_cents=rp.sum_all_earnings_cents(db, user.id),
        recent_payouts=[ReferralPayoutOut.model_validate(p) for p in recent],
    )


@router.get("/cash-out/history", response_model=ReferralCashOutHistoryOut)
def referral_cash_out_history(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ReferralCashOutHistoryOut:
    rows = rco.list_cash_out_requests(db, user.id, limit=50)
    return ReferralCashOutHistoryOut(
        requests=[ReferralCashOutRequestOut.model_validate(r) for r in rows],
    )


@router.get("/cash-out/latest", response_model=ReferralCashOutRequestOut | None)
def referral_cash_out_latest(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ReferralCashOutRequestOut | None:
    row = rco.latest_open_cash_out_request(db, user.id)
    if not row:
        return None
    return ReferralCashOutRequestOut.model_validate(row)


@router.post("/cash-out", response_model=ReferralCashOutRequestOut, status_code=status.HTTP_201_CREATED)
def referral_cash_out_request(
    body: ReferralCashOutRequestIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ReferralCashOutRequestOut:
    try:
        row = rco.create_cash_out_request(
            db,
            user_id=user.id,
            payout_method=body.payout_method,
            payout_details=body.payout_details,
        )
    except ValueError as exc:
        code = str(exc)
        if code == "no_pending_earnings":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No pending referral earnings to cash out.",
            ) from exc
        if code == "open_request_exists":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="You already have an open cash-out request.",
            ) from exc
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid cash-out request.") from exc
    db.commit()
    db.refresh(row)
    return ReferralCashOutRequestOut.model_validate(row)


@router.get("/leaderboard", response_model=ReferralLeaderboardOut)
def referral_leaderboard(
    window: str = Query("month", pattern="^(month|all)$"),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ReferralLeaderboardOut:
    rows = rp.leaderboard_rows(db, window=window, limit=30)
    return ReferralLeaderboardOut(
        window=window,
        entries=[ReferralLeaderboardEntryOut.model_validate(r) for r in rows],
    )
