"""Referral program API schemas."""

from datetime import datetime

from pydantic import BaseModel, Field


class ReferralPreviewOut(BaseModel):
    display_name: str
    referral_tier: str


class ReferralPayoutOut(BaseModel):
    id: int
    referral_id: int | None
    payout_type: str
    amount_cents: int
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ReferralMeOut(BaseModel):
    referral_public_token: str
    share_example_path: str = Field(
        description="Example: /register?ref=<token> (append to FRONTEND_URL).",
    )
    referral_tier: str
    qualified_referrals: int
    referred_user_count: int
    pending_earnings_cents: int
    lifetime_earnings_cents: int
    recent_payouts: list[ReferralPayoutOut]


class ReferralLeaderboardEntryOut(BaseModel):
    rank: int
    referrer_user_id: int
    display_name: str
    referral_tier: str
    qualified_referrals: int
    earnings_cents: int


class ReferralLeaderboardOut(BaseModel):
    window: str
    entries: list[ReferralLeaderboardEntryOut]


class ReferralCashOutRequestIn(BaseModel):
    payout_method: str = Field(pattern="^(bank_transfer|paypal)$")
    payout_details: str | None = Field(default=None, max_length=500)


class ReferralCashOutRequestOut(BaseModel):
    id: int
    amount_cents: int
    payout_method: str
    payout_details: str | None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ReferralCashOutHistoryOut(BaseModel):
    requests: list[ReferralCashOutRequestOut]
