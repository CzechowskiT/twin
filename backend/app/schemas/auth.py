"""Auth-related schemas."""

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    gdpr_consent: bool = Field(description="Must accept privacy policy")


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=1, max_length=512)
    password: str = Field(min_length=8, max_length=128)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: int
    email: EmailStr
    gdpr_consent_at: datetime | None
    linkedin_connected: bool = False
    plan_tier: str = "free"
    subscription_status: str | None = None
    subscription_current_period_end: datetime | None = None

    model_config = {"from_attributes": True}

    @classmethod
    def from_user(cls, user) -> "UserOut":
        return cls(
            id=user.id,
            email=user.email,
            gdpr_consent_at=user.gdpr_consent_at,
            linkedin_connected=bool(getattr(user, "linkedin_id", None)),
            plan_tier=getattr(user, "plan_tier", None) or "free",
            subscription_status=getattr(user, "subscription_status", None),
            subscription_current_period_end=getattr(user, "subscription_current_period_end", None),
        )
