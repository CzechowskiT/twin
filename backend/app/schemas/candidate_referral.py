"""Candidate referral program API schemas — Wave B slice 3."""

from datetime import datetime

from pydantic import BaseModel, Field


class CandidateReferralItemOut(BaseModel):
    id: int
    status: str
    invite_email: str | None
    referred_user_id: int | None
    ref_code_used: str | None
    created_at: datetime
    signed_up_at: datetime | None


class CandidateReferralProgramOut(BaseModel):
    candidate_id: int
    referral_code: str
    share_path: str
    total_referrals: int
    pending_invites: int
    signed_up_count: int
    qualified_count: int
    created_at: datetime
    updated_at: datetime


class CandidateReferralsOut(BaseModel):
    program: CandidateReferralProgramOut
    referrals: list[CandidateReferralItemOut]
    manual_processing_notice: str
    pilot_labelled: bool


class CandidateReferralEnsureCodeOut(BaseModel):
    program: CandidateReferralProgramOut
    created: bool


class CandidateReferralInviteIn(BaseModel):
    invite_email: str = Field(..., min_length=3, max_length=320)


class CandidateReferralInviteOut(BaseModel):
    referral: CandidateReferralItemOut
    no_outreach_notice: str


class CandidateReferralResolveOut(BaseModel):
    display_name: str
    referral_code: str
    valid: bool
