"""Auth-related schemas."""

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    referred_by_note: str | None = Field(
        default=None,
        max_length=500,
        description="Optional: who referred you (free text). If it is an active user's email, they stay eligible for a future referral bonus.",
    )
    gdpr_consent: bool = Field(description="Privacy policy — personal data processing for the service")
    terms_of_service_consent: bool = Field(description="Terms of Service acceptance")
    job_data_processing_consent: bool = Field(
        description="Use of third-party job listing data for your personalised feed and applications",
    )
    ai_matching_consent: bool = Field(
        description="AI-assisted matching (e.g. scoring) using your profile and listings",
    )
    marketing_emails_opt_in: bool = Field(
        default=False,
        description="Optional: product updates and tips by email (separate legal basis).",
    )
    utm_source: str | None = Field(default=None, max_length=128)
    utm_medium: str | None = Field(default=None, max_length=128)
    utm_campaign: str | None = Field(default=None, max_length=128)
    utm_content: str | None = Field(default=None, max_length=128)
    ref: str | None = Field(
        default=None,
        max_length=128,
        description="Optional share token (same as referrer's referral_public_token); also sendable as ?ref= on /register.",
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
    accept_privacy_policy: bool = Field(description="Privacy policy for personal data")
    accept_terms_of_service: bool = Field(description="Terms of Service")
    accept_job_data_processing: bool = Field(description="Third-party job listings for your account")
    accept_ai_matching: bool = Field(description="AI-assisted job matching")
    marketing_emails_opt_in: bool | None = Field(
        default=None,
        description="If set, updates optional marketing email opt-in; if omitted, existing preference is unchanged.",
    )


class UserMarketingPreference(BaseModel):
    marketing_emails_opt_in: bool


class UserOut(BaseModel):
    id: int
    email: EmailStr
    gdpr_consent_at: datetime | None
    terms_of_service_accepted_at: datetime | None = None
    job_data_processing_consent_at: datetime | None = None
    ai_matching_consent_at: datetime | None = None
    identity_provider_processing_consent_at: datetime | None = None
    marketing_emails_opt_in: bool = False
    marketing_emails_opt_in_at: datetime | None = None
    linkedin_connected: bool = False
    plan_tier: str = "free"
    subscription_status: str | None = None
    subscription_current_period_end: datetime | None = None
    identity_verified_at: datetime | None = None
    referral_public_token: str | None = None

    model_config = {"from_attributes": True}

    @classmethod
    def from_user(cls, user) -> "UserOut":
        return cls(
            id=user.id,
            email=user.email,
            gdpr_consent_at=user.gdpr_consent_at,
            terms_of_service_accepted_at=getattr(user, "terms_of_service_accepted_at", None),
            job_data_processing_consent_at=getattr(user, "job_data_processing_consent_at", None),
            ai_matching_consent_at=getattr(user, "ai_matching_consent_at", None),
            identity_provider_processing_consent_at=getattr(
                user, "identity_provider_processing_consent_at", None
            ),
            marketing_emails_opt_in=bool(getattr(user, "marketing_emails_opt_in", False)),
            marketing_emails_opt_in_at=getattr(user, "marketing_emails_opt_in_at", None),
            linkedin_connected=bool(getattr(user, "linkedin_id", None)),
            plan_tier=getattr(user, "plan_tier", None) or "free",
            subscription_status=getattr(user, "subscription_status", None),
            subscription_current_period_end=getattr(user, "subscription_current_period_end", None),
            identity_verified_at=getattr(user, "identity_verified_at", None),
            referral_public_token=getattr(user, "referral_public_token", None),
        )
