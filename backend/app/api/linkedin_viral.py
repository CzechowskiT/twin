"""LinkedIn viral incentive (placement post bonus) API."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.config import get_settings
from app.core.deps import get_current_user
from app.database.models import LinkedInViralIncentiveClaim, User, ViralClaimStatus
from app.database.session import get_db
from app.schemas.linkedin_viral import LinkedInViralClaimCreate, LinkedInViralClaimOut, LinkedInViralMeOut
from app.services.linkedin_viral_incentive import (
    assert_application_hired_for_user,
    is_valid_linkedin_post_url,
    recalculate_claim_bonus,
)
from app.services.referral_public_token import ensure_user_referral_public_token

router = APIRouter()


@router.get("/me", response_model=LinkedInViralMeOut)
def linkedin_viral_me(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> LinkedInViralMeOut:
    settings = get_settings()
    token = ensure_user_referral_public_token(db, user)
    db.commit()
    db.refresh(user)

    claims = (
        db.query(LinkedInViralIncentiveClaim)
        .filter(LinkedInViralIncentiveClaim.user_id == user.id)
        .order_by(LinkedInViralIncentiveClaim.created_at.desc())
        .all()
    )
    for c in claims:
        recalculate_claim_bonus(db, c, settings)
    db.commit()
    for c in claims:
        db.refresh(c)

    pending = 0
    approved = 0
    paid = 0
    for c in claims:
        if c.status in (ViralClaimStatus.DRAFT, ViralClaimStatus.SUBMITTED):
            pending += int(c.bonus_cents_calculated)
        elif c.status == ViralClaimStatus.APPROVED:
            approved += int(c.bonus_cents_calculated)
        elif c.status == ViralClaimStatus.PAID:
            paid += int(c.bonus_cents_calculated)

    return LinkedInViralMeOut(
        referral_public_token=token,
        claims=[LinkedInViralClaimOut.model_validate(c) for c in claims],
        total_bonus_cents_pending=pending,
        total_bonus_cents_approved=approved,
        total_bonus_cents_paid=paid,
    )


@router.post("/claims", response_model=LinkedInViralClaimOut, status_code=status.HTTP_201_CREATED)
def create_linkedin_viral_claim(
    body: LinkedInViralClaimCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> LinkedInViralIncentiveClaim:
    if not is_valid_linkedin_post_url(body.post_url):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="post_url must be http(s) with host linkedin.com (or *.linkedin.com)",
        )

    application_id: int | None = None
    if body.application_id is not None:
        try:
            assert_application_hired_for_user(db, user_id=user.id, application_id=body.application_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="application_id must reference your own hired application",
            ) from None
        application_id = body.application_id

    ensure_user_referral_public_token(db, user)

    now = datetime.now(timezone.utc)
    st = ViralClaimStatus.SUBMITTED if body.submit else ViralClaimStatus.DRAFT
    claim = LinkedInViralIncentiveClaim(
        user_id=user.id,
        application_id=application_id,
        post_url=body.post_url.strip(),
        word_count=body.word_count,
        has_offer_letter_photo=body.has_offer_letter_photo,
        has_video_testimonial=body.has_video_testimonial,
        screenshot_url_primary=body.screenshot_url_primary,
        screenshot_url_secondary=body.screenshot_url_secondary,
        notes=body.notes,
        status=st,
        submitted_at=now if body.submit else None,
    )
    db.add(claim)
    db.flush()
    recalculate_claim_bonus(db, claim, get_settings())
    db.commit()
    db.refresh(claim)
    return claim
