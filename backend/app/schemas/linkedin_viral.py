"""Schemas for LinkedIn viral incentive API."""

from datetime import datetime

from pydantic import BaseModel, Field


class LinkedInViralClaimCreate(BaseModel):
    post_url: str = Field(min_length=12, max_length=2048)
    application_id: int | None = Field(
        default=None,
        description="Optional hired application to attach; must be HIRED for this user.",
    )
    word_count: int | None = Field(default=None, ge=0, le=100_000)
    has_offer_letter_photo: bool = False
    has_video_testimonial: bool = False
    screenshot_url_primary: str | None = Field(default=None, max_length=2048)
    screenshot_url_secondary: str | None = Field(default=None, max_length=2048)
    notes: str | None = Field(default=None, max_length=5000)
    submit: bool = Field(
        default=True,
        description="If true, claim moves to submitted and accrues signup attribution from now.",
    )


class LinkedInViralClaimOut(BaseModel):
    id: int
    post_url: str
    application_id: int | None
    word_count: int | None
    has_offer_letter_photo: bool
    has_video_testimonial: bool
    screenshot_url_primary: str | None
    screenshot_url_secondary: str | None
    notes: str | None
    bonus_cents_calculated: int
    bonus_currency: str
    status: str
    reviewer_notes: str | None
    submitted_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class LinkedInViralMeOut(BaseModel):
    referral_public_token: str = Field(
        ...,
        description=(
            "Public token for utm_content on share/signup links, e.g. "
            "?utm_source=linkedin&utm_medium=post&utm_campaign=viral&utm_content=<token>"
        ),
    )
    claims: list[LinkedInViralClaimOut]
    total_bonus_cents_pending: int
    total_bonus_cents_approved: int
    total_bonus_cents_paid: int
