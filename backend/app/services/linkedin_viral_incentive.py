"""LinkedIn viral incentive bonus math and persistence.

Tier amounts and thresholds are loaded from :class:`app.config.Settings` (environment variables).
Ops can adjust payouts without deploy by setting, for example:

- ``LINKEDIN_VIRAL_BASE_TAG_BONUS_CENTS`` — base amount for tagging TWIN / posting (cents).
- ``LINKEDIN_VIRAL_STORY_BONUS_CENTS`` — extra when story word count meets minimum.
- ``LINKEDIN_VIRAL_STORY_MIN_WORDS`` — minimum ``word_count`` for the story bonus.
- ``LINKEDIN_VIRAL_PHOTO_BONUS_CENTS`` — extra when ``has_offer_letter_photo`` is true.
- ``LINKEDIN_VIRAL_VIDEO_BONUS_CENTS`` — extra when ``has_video_testimonial`` is true.
- ``LINKEDIN_VIRAL_PER_SIGNUP_BONUS_CENTS`` — cents per attributed signup after submit.

Attributed signups (MVP): users whose ``signup_utm_content`` exactly matches the claimant's
``referral_public_token`` and whose ``created_at`` is on or after the claim's ``submitted_at``.
Draft claims do not accrue per-signup bonuses (no ``submitted_at`` yet).
"""

from __future__ import annotations

from datetime import datetime
from urllib.parse import urlparse

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import Settings
from app.database.models import (
    Application,
    ApplicationStatus,
    Candidate,
    LinkedInViralIncentiveClaim,
    User,
    ViralClaimStatus,
)


def is_valid_linkedin_post_url(url: str, *, max_len: int = 2048) -> bool:
    """Return True if ``url`` is http(s) with a LinkedIn host (``linkedin.com`` / ``*.linkedin.com``)."""
    s = url.strip()
    if not s or len(s) > max_len:
        return False
    parsed = urlparse(s)
    if parsed.scheme not in ("http", "https"):
        return False
    host = (parsed.hostname or "").lower()
    return host == "linkedin.com" or host.endswith(".linkedin.com")


def count_attributed_signups_for_token(
    db: Session,
    *,
    referral_token: str,
    since: datetime,
) -> int:
    """Count users registered with ``signup_utm_content == referral_token`` at/after ``since``."""
    return (
        db.query(func.count(User.id))
        .filter(
            User.signup_utm_content == referral_token,
            User.created_at >= since,
        )
        .scalar()
        or 0
    )


def calculate_bonus_cents(
    settings: Settings,
    *,
    word_count: int | None,
    has_offer_letter_photo: bool,
    has_video_testimonial: bool,
    attributed_signup_count: int,
) -> int:
    """Compute total bonus in cents from tiers and signup count."""
    total = int(settings.linkedin_viral_base_tag_bonus_cents)
    if word_count is not None and word_count >= int(settings.linkedin_viral_story_min_words):
        total += int(settings.linkedin_viral_story_bonus_cents)
    if has_offer_letter_photo:
        total += int(settings.linkedin_viral_photo_bonus_cents)
    if has_video_testimonial:
        total += int(settings.linkedin_viral_video_bonus_cents)
    total += attributed_signup_count * int(settings.linkedin_viral_per_signup_bonus_cents)
    return total


def recalculate_claim_bonus(db: Session, claim: LinkedInViralIncentiveClaim, settings: Settings) -> int:
    """Update ``claim.bonus_cents_calculated`` unless terminal; return new total."""
    if claim.status in (ViralClaimStatus.PAID, ViralClaimStatus.REJECTED):
        return int(claim.bonus_cents_calculated)

    owner = db.query(User).filter(User.id == claim.user_id).one()
    token = owner.referral_public_token
    attributed = 0
    if token and claim.submitted_at is not None:
        attributed = int(
            count_attributed_signups_for_token(db, referral_token=token, since=claim.submitted_at)
        )

    cents = calculate_bonus_cents(
        settings,
        word_count=claim.word_count,
        has_offer_letter_photo=bool(claim.has_offer_letter_photo),
        has_video_testimonial=bool(claim.has_video_testimonial),
        attributed_signup_count=attributed,
    )
    claim.bonus_cents_calculated = cents
    db.add(claim)
    return cents


def assert_application_hired_for_user(
    db: Session,
    *,
    user_id: int,
    application_id: int,
) -> Application:
    """Return ``Application`` if it belongs to the user's candidate and is ``HIRED``."""
    row = (
        db.query(Application)
        .join(Candidate, Application.candidate_id == Candidate.id)
        .filter(
            Candidate.user_id == user_id,
            Application.id == application_id,
            Application.status == ApplicationStatus.HIRED,
        )
        .first()
    )
    if not row:
        raise ValueError("application_not_hired_or_not_owned")
    return row


def set_claim_status_for_testing(
    db: Session,
    claim_id: int,
    status: ViralClaimStatus,
    reviewer_notes: str | None = None,
) -> LinkedInViralIncentiveClaim | None:
    """Internal status transition helper (tests / future admin); not exposed on public API."""
    claim = db.query(LinkedInViralIncentiveClaim).filter(LinkedInViralIncentiveClaim.id == claim_id).first()
    if not claim:
        return None
    claim.status = status
    if reviewer_notes is not None:
        claim.reviewer_notes = reviewer_notes
    db.add(claim)
    db.commit()
    db.refresh(claim)
    return claim
