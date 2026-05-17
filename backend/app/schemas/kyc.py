"""KYC / identity verification API contracts."""

from datetime import datetime

from pydantic import BaseModel, Field


class KycConfiguredOut(BaseModel):
    configured: bool


class AuthologicStartRequest(BaseModel):
    identity_provider_processing_consent: bool = Field(
        description="Must be true — Authologic processes identity data per their terms and our Privacy Policy",
    )


class AuthologicStartResponse(BaseModel):
    redirect_url: str
    conversation_id: str


class KycStatusOut(BaseModel):
    identity_verified_at: datetime | None
    latest_conversation_id: str | None = None
    conversation_status: str | None = None
    identity_status: str | None = None


class KycSyncBody(BaseModel):
    conversation_id: str = Field(min_length=8, max_length=64)
