"""Auth-related schemas."""

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    gdpr_consent: bool = Field(description="Must accept privacy policy")
    marketing_emails_opt_in: bool = Field(
        default=False,
        description="Optional: product updates and tips by email (separate legal basis).",
    )


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


class GdprConsentIn(BaseModel):
    accept_privacy_policy: bool = Field(description="Must be true to record GDPR consent")


class UserMarketingPreference(BaseModel):
    marketing_emails_opt_in: bool


class UserOut(BaseModel):
    id: int
    email: EmailStr
    gdpr_consent_at: datetime | None
    marketing_emails_opt_in: bool = False
    marketing_emails_opt_in_at: datetime | None = None
    linkedin_connected: bool = False
    plan_tier: str = "free"
    subscription_status: str | None = None
    subscription_current_period_end: datetime | None = None
    identity_verified_at: datetime | None = None

    model_config = {"from_attributes": True}

    @classmethod
    def from_user(cls, user) -> "UserOut":
        return cls(
            id=user.id,
            email=user.email,
            gdpr_consent_at=user.gdpr_consent_at,
            marketing_emails_opt_in=bool(getattr(user, "marketing_emails_opt_in", False)),
            marketing_emails_opt_in_at=getattr(user, "marketing_emails_opt_in_at", None),
            linkedin_connected=bool(getattr(user, "linkedin_id", None)),
            plan_tier=getattr(user, "plan_tier", None) or "free",
            subscription_status=getattr(user, "subscription_status", None),
            subscription_current_period_end=getattr(user, "subscription_current_period_end", None),
            identity_verified_at=getattr(user, "identity_verified_at", None),
        )
