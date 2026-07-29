"""SQLAlchemy ORM models."""

from datetime import date, datetime
from enum import Enum as PyEnum

from sqlalchemy import (
    BigInteger,
    Boolean,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    LargeBinary,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class ApplicationStatus(str, PyEnum):
    PENDING = "pending"
    APPLIED = "applied"
    INTERVIEW = "interview"
    REJECTED = "rejected"
    HIRED = "hired"


class RecruiterPipelineStatus(str, PyEnum):
    """ATS-lite recruiter stage — separate from candidate Application.status."""

    NEW = "new"
    REVIEW = "review"
    ACCEPTED = "accepted"
    TO_CONTACT = "to_contact"
    INVITED = "invited"
    REJECTED = "rejected"
    ON_HOLD = "on_hold"


class SubmissionStatus(str, PyEnum):
    APPLICATION_CREATED_IN_TWIN = "application_created_in_twin"
    APPLICATION_PREPARED = "application_prepared"
    EXTERNAL_SUBMIT_ATTEMPTED = "external_submit_attempted"
    EXTERNAL_SUBMIT_CONFIRMED = "external_submit_confirmed"
    EXTERNAL_SUBMIT_FAILED = "external_submit_failed"
    MANUAL_ACTION_REQUIRED = "manual_action_required"


class SupportedApplyMode(str, PyEnum):
    VERIFIED_AUTO_APPLY = "verified_auto_apply"
    ASSISTED_APPLY = "assisted_apply"
    MANUAL_ONLY = "manual_only"
    UNSUPPORTED = "unsupported"


class ConfirmationType(str, PyEnum):
    CONFIRMATION_PAGE = "confirmation_page"
    CONFIRMATION_EMAIL = "confirmation_email"
    ATS_APPLICATION_ID = "ats_application_id"
    SCREENSHOT = "screenshot"
    MANUAL_USER_CONFIRMATION = "manual_user_confirmation"
    API_RESPONSE = "api_response"
    NONE = "none"


class ViralClaimStatus(str, PyEnum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    REJECTED = "rejected"
    PAID = "paid"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str | None] = mapped_column(String(255), nullable=True)
    linkedin_id: Mapped[str | None] = mapped_column(String(64), unique=True, index=True, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    gdpr_consent_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    marketing_emails_opt_in: Mapped[bool] = mapped_column(Boolean, default=False)
    marketing_emails_opt_in_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    terms_of_service_accepted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    job_data_processing_consent_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    ai_matching_consent_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    identity_provider_processing_consent_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Billing (Stripe Checkout + Customer Portal; Apple Pay / Google Pay via Checkout wallets)
    plan_tier: Mapped[str] = mapped_column(String(32), default="free")
    subscription_status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    stripe_customer_id: Mapped[str | None] = mapped_column(String(255), nullable=True, unique=True)
    stripe_subscription_id: Mapped[str | None] = mapped_column(String(255), nullable=True, unique=True)
    subscription_current_period_end: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    identity_verified_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    signup_referred_by_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    signup_referrer_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    referral_public_token: Mapped[str | None] = mapped_column(
        String(32),
        unique=True,
        index=True,
        nullable=True,
    )
    signup_utm_source: Mapped[str | None] = mapped_column(String(128), nullable=True)
    signup_utm_medium: Mapped[str | None] = mapped_column(String(128), nullable=True)
    signup_utm_campaign: Mapped[str | None] = mapped_column(String(128), nullable=True)
    signup_utm_content: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    subscription_invoice_payment_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    billing_company_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    billing_tax_id: Mapped[str | None] = mapped_column(String(64), nullable=True)

    # Optional email channels (default off — separate opt-in from service/consent emails).
    email_product_updates: Mapped[bool] = mapped_column(Boolean, default=False)
    email_interview_reminders: Mapped[bool] = mapped_column(Boolean, default=False)
    profile_documents_processing_consent_at: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True
    )
    onboarding_completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    # Server-side onboarding resume (Phase 2 hardening) — step id + JSON progress blob.
    onboarding_step: Mapped[str | None] = mapped_column(String(64), nullable=True)
    onboarding_progress_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Ops/smoke accounts — excluded from North Star and business funnel aggregates by default.
    exclude_from_product_metrics: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    email_verified_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    welcome_email_sent_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    first_match_email_sent_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    candidate: Mapped["Candidate | None"] = relationship(back_populates="user")
    product_feedback: Mapped[list["ProductFeedback"]] = relationship(back_populates="user")
    password_reset_tokens: Mapped[list["PasswordResetToken"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    email_verification_tokens: Mapped[list["EmailVerificationToken"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    oauth_accounts: Mapped[list["OAuthAccount"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    identity_verifications: Mapped[list["IdentityVerification"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    google_calendar: Mapped["UserGoogleCalendar | None"] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    microsoft_calendar: Mapped["UserMicrosoftCalendar | None"] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    webcal_feed_token_hash: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    webcal_feed_token_expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    scheduled_interviews: Mapped[list["ScheduledInterview"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    viral_incentive_claims: Mapped[list["LinkedInViralIncentiveClaim"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    profile_documents: Mapped[list["UserProfileDocument"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )


class UserProfileDocument(Base):
    """Arbitrary user files from Profile → Documents (storage only; no automated parsing in MVP)."""

    __tablename__ = "user_profile_documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    original_filename: Mapped[str] = mapped_column(String(512))
    storage_path: Mapped[str] = mapped_column(String(768))
    content_type: Mapped[str | None] = mapped_column(String(128), nullable=True)
    size_bytes: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="profile_documents")


class UserGoogleCalendar(Base):
    """Offline Google Calendar access for availability checks and interview blocks."""

    __tablename__ = "user_google_calendar"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    refresh_token_encrypted: Mapped[str] = mapped_column(Text)
    access_token_encrypted: Mapped[str | None] = mapped_column(Text, nullable=True)
    access_token_expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    google_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    user: Mapped["User"] = relationship(back_populates="google_calendar")


class UserMicrosoftCalendar(Base):
    """Offline Microsoft Graph calendar access (Outlook / Microsoft 365)."""

    __tablename__ = "user_microsoft_calendar"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    refresh_token_encrypted: Mapped[str] = mapped_column(Text)
    access_token_encrypted: Mapped[str | None] = mapped_column(Text, nullable=True)
    access_token_expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    microsoft_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    user: Mapped["User"] = relationship(back_populates="microsoft_calendar")


class IdentityVerification(Base):
    """Provider-backed identity check (e.g. Authologic). Stores status only — not document images."""

    __tablename__ = "identity_verifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    provider: Mapped[str] = mapped_column(String(32), default="authologic")
    conversation_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    user_key: Mapped[str] = mapped_column(String(200))
    conversation_status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    identity_status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    redirect_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    summary_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    user: Mapped["User"] = relationship(back_populates="identity_verifications")


class OAuthAccount(Base):
    __tablename__ = "oauth_accounts"
    __table_args__ = (UniqueConstraint("provider", "subject", name="uq_oauth_accounts_provider_subject"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    provider: Mapped[str] = mapped_column(String(32), index=True)
    subject: Mapped[str] = mapped_column(String(255), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="oauth_accounts")


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="password_reset_tokens")


class EmailVerificationToken(Base):
    __tablename__ = "email_verification_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="email_verification_tokens")


class Candidate(Base):
    __tablename__ = "candidates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True)
    name: Mapped[str] = mapped_column(String(200))
    skills: Mapped[str] = mapped_column(Text, default="[]")
    experience_years: Mapped[int] = mapped_column(Integer, default=0)
    desired_salary: Mapped[int | None] = mapped_column(Integer, nullable=True)
    location: Mapped[str | None] = mapped_column(String(100), nullable=True)
    resume_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    cv_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    cv_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    cv_uploaded_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    preferred_job_titles: Mapped[str] = mapped_column(Text, default="[]")
    intro_audio_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    intro_audio_uploaded_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    intro_audio_transcript: Mapped[str | None] = mapped_column(Text, nullable=True)
    profile_signals_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    talent_pool_opt_in: Mapped[bool] = mapped_column(Boolean, default=False)
    talent_pool_opt_in_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    cv_processing_consent_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    intro_audio_processing_consent_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="candidate")
    applications: Mapped[list["Application"]] = relationship(back_populates="candidate")
    matches: Mapped[list["JobMatch"]] = relationship(back_populates="candidate")
    job_match_feedback: Mapped[list["JobMatchFeedback"]] = relationship(
        back_populates="candidate",
        cascade="all, delete-orphan",
    )
    auto_apply_consent: Mapped["AutoApplyConsent | None"] = relationship(
        back_populates="candidate",
        uselist=False,
    )
    saved_jobs: Mapped[list["SavedJob"]] = relationship(
        back_populates="candidate",
        cascade="all, delete-orphan",
    )
    evidence_items: Mapped[list["CandidateEvidenceItem"]] = relationship(
        back_populates="candidate",
        cascade="all, delete-orphan",
    )
    career_compass: Mapped["CandidateCareerCompass | None"] = relationship(
        back_populates="candidate",
        uselist=False,
        cascade="all, delete-orphan",
    )
    consent_receipts: Mapped[list["CandidateConsentReceipt"]] = relationship(
        back_populates="candidate",
        cascade="all, delete-orphan",
    )
    privacy_requests: Mapped[list["CandidatePrivacyRequest"]] = relationship(
        back_populates="candidate",
        cascade="all, delete-orphan",
    )
    trust_audit_events: Mapped[list["CandidateTrustAuditEvent"]] = relationship(
        back_populates="candidate",
        cascade="all, delete-orphan",
    )
    referral_program: Mapped["CandidateReferralProgram | None"] = relationship(
        back_populates="candidate",
        uselist=False,
        cascade="all, delete-orphan",
    )
    progress: Mapped["CandidateProgress | None"] = relationship(
        back_populates="candidate",
        uselist=False,
        cascade="all, delete-orphan",
    )


class CandidateProgress(Base):
    """Gamification progress (XP, streaks, badges) — separate from career_compass JSON."""

    __tablename__ = "candidate_progress"
    __table_args__ = (UniqueConstraint("candidate_id", name="uq_candidate_progress_candidate_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(ForeignKey("candidates.id", ondelete="CASCADE"), unique=True)
    xp_total: Mapped[int] = mapped_column(Integer, default=0)
    level: Mapped[int] = mapped_column(Integer, default=1)
    streak_days: Mapped[int] = mapped_column(Integer, default=0)
    last_active_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    badges_json: Mapped[str] = mapped_column(Text, default="[]")
    stats_json: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    candidate: Mapped["Candidate"] = relationship(back_populates="progress")


class BetaWaitlist(Base):
    """Pre-launch waitlist signups (separate from `users`)."""

    __tablename__ = "beta_waitlist"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    linkedin_subject: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    job_title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    min_salary: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cv_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    voice_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    referral_code: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    referred_by_code: Mapped[str | None] = mapped_column(String(32), index=True, nullable=True)
    priority_points: Mapped[int] = mapped_column(Integer, default=0)
    linkedin_shared: Mapped[bool] = mapped_column(Boolean, default=False)
    cv_uploaded: Mapped[bool] = mapped_column(Boolean, default=False)
    voice_recorded: Mapped[bool] = mapped_column(Boolean, default=False)
    testimonial_posted: Mapped[bool] = mapped_column(Boolean, default=False)
    source: Mapped[str | None] = mapped_column(String(32), nullable=True)
    privacy_and_email_consent_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class BetaReferral(Base):
    """Referee joined with `?ref=` pointing at referrer's `referral_code`."""

    __tablename__ = "beta_referrals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    referrer_code: Mapped[str] = mapped_column(String(32), index=True)
    referee_waitlist_id: Mapped[int] = mapped_column(ForeignKey("beta_waitlist.id", ondelete="CASCADE"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AccountReferral(Base):
    """Edge when a registered user was acquired via another user's share token or email-shaped note."""

    __tablename__ = "account_referrals"
    __table_args__ = (UniqueConstraint("referred_user_id", name="uq_account_referrals_referred_user_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    referrer_user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    referred_user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    ref_code_used: Mapped[str | None] = mapped_column(String(32), nullable=True)
    utm_source: Mapped[str | None] = mapped_column(String(120), nullable=True)
    utm_medium: Mapped[str | None] = mapped_column(String(120), nullable=True)
    utm_campaign: Mapped[str | None] = mapped_column(String(120), nullable=True)
    utm_content: Mapped[str | None] = mapped_column(String(120), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ReferralPayout(Base):
    """Bonus owed to referrer; `referral_id` null means aggregate milestone (not tied to one edge)."""

    __tablename__ = "referral_payouts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    referral_id: Mapped[int | None] = mapped_column(ForeignKey("account_referrals.id", ondelete="CASCADE"), nullable=True)
    referrer_user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    payout_type: Mapped[str] = mapped_column(String(32), nullable=False)
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class ReferralCashOutRequest(Base):
    """User-requested withdrawal of pending referral earnings (manual ops fulfillment)."""

    __tablename__ = "referral_cash_out_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    payout_method: Mapped[str] = mapped_column(String(32), nullable=False)
    payout_details: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="requested")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class RecruiterAtsOAuthConnection(Base):
    """Recruiter ATS OAuth (Greenhouse Harvest partner flow when env is set)."""

    __tablename__ = "recruiter_ats_oauth_connections"
    __table_args__ = (UniqueConstraint("user_id", "provider", name="uq_recruiter_ats_oauth_user_provider"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    provider: Mapped[str] = mapped_column(String(32), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending")
    oauth_state: Mapped[str | None] = mapped_column(String(64), nullable=True)
    external_account_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    oauth_access_token_encrypted: Mapped[str | None] = mapped_column(Text, nullable=True)
    oauth_refresh_token_encrypted: Mapped[str | None] = mapped_column(Text, nullable=True)
    oauth_token_expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class DataRoomDocumentMetadata(Base):
    """Validated upload metadata for investor data room (blob storage optional)."""

    __tablename__ = "data_room_document_metadata"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    category: Mapped[str] = mapped_column(String(64), nullable=False)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str] = mapped_column(String(128), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    checksum_sha256: Mapped[str | None] = mapped_column(String(64), nullable=True)
    storage_key: Mapped[str | None] = mapped_column(String(512), nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="validated")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class DataRoomDocumentBlob(Base):
    """Persistent provider-neutral blob (Postgres) for CORE_PILOT secure download.

    Survives multi-replica API without shared ephemeral disk. Optional S3 remains
    OPTIONAL_INTEGRATION for large objects / CDN.
    """

    __tablename__ = "data_room_document_blobs"

    document_id: Mapped[int] = mapped_column(
        ForeignKey("data_room_document_metadata.id", ondelete="CASCADE"),
        primary_key=True,
    )
    content: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    checksum_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class InvestorNdaAcceptance(Base):
    """Investor NDA acceptance record — gate before confidential data room uploads."""

    __tablename__ = "investor_nda_acceptances"
    __table_args__ = (UniqueConstraint("user_id", "nda_version", name="uq_investor_nda_user_version"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    nda_version: Mapped[str] = mapped_column(String(32), nullable=False)
    ip_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    user_agent_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    accepted_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class InvestorExternalAttestation(Base):
    """Founder-signed external attestation queue — no fake customer claims without SIGNED row."""

    __tablename__ = "investor_external_attestations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    subject_label: Mapped[str] = mapped_column(String(255), nullable=False)
    claim_text: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default="PENDING_FOUNDER_SIGNATURE", index=True
    )
    evidence_ref: Mapped[str | None] = mapped_column(String(512), nullable=True)
    signed_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    signed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class Job(Base):
    __tablename__ = "jobs"
    __table_args__ = (UniqueConstraint("job_board", "external_id", name="uq_job_board_external"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    job_board: Mapped[str] = mapped_column(String(50), index=True)
    external_id: Mapped[str] = mapped_column(String(100))
    title: Mapped[str] = mapped_column(String(300))
    company: Mapped[str] = mapped_column(String(200))
    location: Mapped[str | None] = mapped_column(String(200), nullable=True)
    salary_min: Mapped[int | None] = mapped_column(Integer, nullable=True)
    salary_max: Mapped[int | None] = mapped_column(Integer, nullable=True)
    requirements: Mapped[str | None] = mapped_column(Text, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    tech_stack: Mapped[str] = mapped_column(Text, default="[]")
    requirements_must_have: Mapped[str | None] = mapped_column(Text, nullable=True)
    requirements_nice_to_have: Mapped[str | None] = mapped_column(Text, nullable=True)
    interview_process_json: Mapped[str] = mapped_column(Text, default="[]")
    remote_percentage: Mapped[int | None] = mapped_column(Integer, nullable=True)
    seniority_level: Mapped[str | None] = mapped_column(String(32), nullable=True)
    culture_tags: Mapped[str] = mapped_column(Text, default="[]")
    url: Mapped[str] = mapped_column(String(500))
    is_validated: Mapped[bool] = mapped_column(Boolean, default=False)
    scraped_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    opportunity_type: Mapped[str] = mapped_column(String(32), default="full_time")
    project_duration_months: Mapped[int | None] = mapped_column(Integer, nullable=True)
    hourly_rate_min: Mapped[int | None] = mapped_column(Integer, nullable=True)
    hourly_rate_max: Mapped[int | None] = mapped_column(Integer, nullable=True)
    role_status: Mapped[str | None] = mapped_column(String(16), nullable=True, default="draft")
    work_mode: Mapped[str | None] = mapped_column(String(16), nullable=True)

    matches: Mapped[list["JobMatch"]] = relationship(back_populates="job")
    applications: Mapped[list["Application"]] = relationship(back_populates="job")
    saved_by: Mapped[list["SavedJob"]] = relationship(back_populates="job")


class SavedJob(Base):
    """User-bookmarked job listing (separate from application pipeline)."""

    __tablename__ = "saved_jobs"
    __table_args__ = (UniqueConstraint("candidate_id", "job_id", name="uq_saved_jobs"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(ForeignKey("candidates.id", ondelete="CASCADE"), index=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("jobs.id", ondelete="CASCADE"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    candidate: Mapped["Candidate"] = relationship(back_populates="saved_jobs")
    job: Mapped["Job"] = relationship(back_populates="saved_by")


class JobMatch(Base):
    __tablename__ = "job_matches"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    candidate_id: Mapped[int] = mapped_column(ForeignKey("candidates.id"), index=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("jobs.id"), index=True)
    score: Mapped[float] = mapped_column(Float)
    match_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    candidate: Mapped["Candidate"] = relationship(back_populates="matches")
    job: Mapped["Job"] = relationship(back_populates="matches")


class JobMatchFeedback(Base):
    """Candidate feedback on a ranked job (reranking input, not product NPS)."""

    __tablename__ = "job_match_feedback"
    __table_args__ = (UniqueConstraint("candidate_id", "job_id", name="uq_job_match_feedback"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(ForeignKey("candidates.id", ondelete="CASCADE"), index=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("jobs.id", ondelete="CASCADE"), index=True)
    feedback_value: Mapped[str] = mapped_column(String(32))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    candidate: Mapped["Candidate"] = relationship(back_populates="job_match_feedback")
    job: Mapped["Job"] = relationship()


class Application(Base):
    __tablename__ = "applications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    candidate_id: Mapped[int] = mapped_column(ForeignKey("candidates.id"), index=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("jobs.id"), index=True)
    status: Mapped[ApplicationStatus] = mapped_column(
        Enum(ApplicationStatus, values_callable=lambda x: [e.value for e in x]),
        default=ApplicationStatus.PENDING,
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    recruiter_feedback_raw: Mapped[str | None] = mapped_column(Text, nullable=True)
    feedback_insights_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    applied_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    # Placement verification (self-serve; see docs/PLACEMENT_VERIFICATION.md)
    placement_state: Mapped[str] = mapped_column(String(32), default="none")
    placement_reported_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    placement_work_email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    placement_verification_token_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    placement_verification_expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    placement_employer_attest_token_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    placement_employer_attest_expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    placement_verified_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    placement_declaration_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Optional link to employer ATS (webhook ingest; see /integrations/ats).
    external_ats_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    external_ats_provider: Mapped[str | None] = mapped_column(String(32), nullable=True)
    # Tailored auto-apply PDF persisted to S3 (key only; use presigned GET in API).
    auto_apply_package_s3_key: Mapped[str | None] = mapped_column(String(512), nullable=True)
    auto_apply_package_uploaded_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    auto_applied: Mapped[bool] = mapped_column(Boolean, default=False)
    application_method: Mapped[str | None] = mapped_column(String(32), nullable=True)
    # Honest external submission tracking (see docs/APPLICATION_STATUS_TRUTH_TABLE.md)
    submission_status: Mapped[SubmissionStatus | None] = mapped_column(
        Enum(SubmissionStatus, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
        index=True,
    )
    supported_apply_mode: Mapped[SupportedApplyMode | None] = mapped_column(
        Enum(SupportedApplyMode, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    submit_attempted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    confirmation_type: Mapped[ConfirmationType | None] = mapped_column(
        Enum(ConfirmationType, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    confirmation_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    confirmation_url: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    confirmation_screenshot_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    confirmation_email_detected: Mapped[bool] = mapped_column(Boolean, default=False)
    external_application_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    failure_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    requires_manual_action: Mapped[bool] = mapped_column(Boolean, default=False)
    submit_attempt_logs: Mapped[str | None] = mapped_column(Text, nullable=True)
    recruiter_pipeline_status: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    recruiter_scheduling_status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    recruiter_manual_slot_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    recruiter_manual_slot_duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    recruiter_manual_meeting_link: Mapped[str | None] = mapped_column(String(2000), nullable=True)

    candidate: Mapped["Candidate"] = relationship(back_populates="applications")
    job: Mapped["Job"] = relationship(back_populates="applications")
    scheduled_interviews: Mapped[list["ScheduledInterview"]] = relationship(
        back_populates="application",
    )
    viral_incentive_claims: Mapped[list["LinkedInViralIncentiveClaim"]] = relationship(
        back_populates="application",
    )
    placement_events: Mapped[list["PlacementEvent"]] = relationship(
        back_populates="application",
        cascade="all, delete-orphan",
    )


class CookieConsentEvent(Base):
    """Append-only browser cookie banner decisions (anonymous or linked after login)."""

    __tablename__ = "cookie_consent_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    visitor_key_hash: Mapped[str] = mapped_column(String(64), index=True)
    consent_version: Mapped[int] = mapped_column(Integer)
    choices_json: Mapped[str] = mapped_column(Text)
    decided_at: Mapped[datetime] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class PlacementEvent(Base):
    """Append-only audit trail for placement verification (no raw tokens)."""

    __tablename__ = "placement_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    application_id: Mapped[int | None] = mapped_column(
        ForeignKey("applications.id", ondelete="CASCADE"),
        index=True,
        nullable=True,
    )
    placement_id: Mapped[str | None] = mapped_column(String(128), index=True, nullable=True)
    candidate_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    role_context_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    company_slug: Mapped[str | None] = mapped_column(String(80), nullable=True)
    event_type: Mapped[str] = mapped_column(String(64))
    event_status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    actor: Mapped[str | None] = mapped_column(String(32), nullable=True)
    actor_persona: Mapped[str | None] = mapped_column(String(32), nullable=True)
    detail_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    metadata_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    source: Mapped[str | None] = mapped_column(String(32), default="twin_internal")
    external_side_effect: Mapped[bool] = mapped_column(Boolean, default=False)
    created_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    application: Mapped["Application | None"] = relationship(back_populates="placement_events")


class ApiIdempotency(Base):
    """Stores replay payloads for safe retries (Idempotency-Key header)."""

    __tablename__ = "api_idempotency"
    __table_args__ = (
        UniqueConstraint("user_id", "scope", "idempotency_key", name="uq_api_idempotency_user_scope_key"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    scope: Mapped[str] = mapped_column(String(64), nullable=False)
    idempotency_key: Mapped[str] = mapped_column(String(128), nullable=False)
    body_fingerprint: Mapped[str] = mapped_column(String(64), nullable=False)
    response_status: Mapped[int] = mapped_column(Integer, nullable=False)
    response_json: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class StripeWebhookEvent(Base):
    """Dedup ledger for `POST /api/v1/billing/webhook` deliveries.

    Keyed by Stripe's own globally-unique `event.id`. Insert-then-process
    pattern: the first POST writes a row with `handler_status="pending"`
    and runs the handler; replays land on the unique constraint and
    short-circuit to a `{"received": true, "replayed": true}` response.

    No FK to any other table — the ledger must survive user / candidate
    deletes (we may need to audit a payment for a churned user).
    Design: `docs/P2_STRIPE_EVENT_DEDUP_DESIGN_2026-05-27.md`.
    Helpers (this PR): `app/services/stripe_events.py`. Wire-up into
    `app/api/billing.py` ships in the follow-up commit alongside the
    Alembic migration (the table is intentionally **not yet** migrated
    on prod — see the helper module for the in-prod no-op fallback).
    """

    __tablename__ = "stripe_webhook_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    event_type: Mapped[str] = mapped_column(String(80), nullable=False)
    livemode: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    received_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    processed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    handler_status: Mapped[str] = mapped_column(String(32), default="pending", nullable=False)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)


class RecruiterAuditEvent(Base):
    """Append-only recruiter-side action log (no decline notes or candidate PII)."""

    __tablename__ = "recruiter_audit_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    application_id: Mapped[int] = mapped_column(
        ForeignKey("applications.id", ondelete="CASCADE"),
        index=True,
    )
    company_slug: Mapped[str] = mapped_column(String(80), index=True)
    action_type: Mapped[str] = mapped_column(String(64))
    meta_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class RecruiterWorkspaceActivation(Base):
    """Per-company recruiter onboarding state — Wave C slice 1."""

    __tablename__ = "recruiter_workspace_activation"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    company_slug: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    workspace_connected_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    queue_loaded_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    first_decision_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    first_decision_action: Mapped[str | None] = mapped_column(String(16), nullable=True)
    activation_completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class RecruiterActivationEvent(Base):
    """Append-only recruiter activation milestone audit."""

    __tablename__ = "recruiter_activation_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    company_slug: Mapped[str] = mapped_column(String(80), index=True)
    step: Mapped[str] = mapped_column(String(64))
    meta_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class RecruiterTalentRadarDecision(Base):
    """Persisted talent radar recruiter actions (shortlist, snooze, dismiss, audit-only)."""

    __tablename__ = "recruiter_talent_radar_decisions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    application_id: Mapped[int] = mapped_column(
        ForeignKey("applications.id", ondelete="CASCADE"),
        index=True,
    )
    company_slug: Mapped[str] = mapped_column(String(80), index=True)
    action_type: Mapped[str] = mapped_column(String(64))
    meta_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    snooze_until: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CandidateEvidenceItem(Base):
    """Skill evidence artifact linked to a candidate profile vault."""

    __tablename__ = "candidate_evidence_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(
        ForeignKey("candidates.id", ondelete="CASCADE"),
        index=True,
    )
    skill_name: Mapped[str] = mapped_column(String(120))
    evidence_type: Mapped[str] = mapped_column(String(40))
    title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_url: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    privacy_class: Mapped[str] = mapped_column(String(40), default="candidate_private")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    candidate: Mapped["Candidate"] = relationship(back_populates="evidence_items")


class CandidateCareerCompass(Base):
    """Persistent career compass — one record per candidate (Wave B slice 1)."""

    __tablename__ = "candidate_career_compass"
    __table_args__ = (UniqueConstraint("candidate_id", name="uq_candidate_career_compass_candidate_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(
        ForeignKey("candidates.id", ondelete="CASCADE"),
        index=True,
        unique=True,
    )
    target_role: Mapped[str | None] = mapped_column(String(200), nullable=True)
    target_seniority: Mapped[str | None] = mapped_column(String(40), nullable=True)
    preferred_industries: Mapped[str] = mapped_column(Text, default="[]")
    preferred_locations: Mapped[str] = mapped_column(Text, default="[]")
    work_mode: Mapped[str | None] = mapped_column(String(32), nullable=True)
    salary_expectation_min: Mapped[int | None] = mapped_column(Integer, nullable=True)
    salary_expectation_max: Mapped[int | None] = mapped_column(Integer, nullable=True)
    salary_currency: Mapped[str] = mapped_column(String(8), default="PLN")
    career_priorities: Mapped[str] = mapped_column(Text, default="[]")
    skill_gaps: Mapped[str] = mapped_column(Text, default="[]")
    strengths: Mapped[str] = mapped_column(Text, default="[]")
    next_steps: Mapped[str] = mapped_column(Text, default="[]")
    learning_actions: Mapped[str] = mapped_column(Text, default="[]")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    completion_status: Mapped[str] = mapped_column(String(20), default="draft")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    candidate: Mapped["Candidate"] = relationship(back_populates="career_compass")


class CandidateCareerGraph(Base):
    """Career Copilot 2.0 — persistent canonical career graph (one per candidate)."""

    __tablename__ = "candidate_career_graphs"
    __table_args__ = (UniqueConstraint("candidate_id", name="uq_candidate_career_graphs_candidate_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(
        ForeignKey("candidates.id", ondelete="CASCADE"), index=True, unique=True
    )
    graph_json: Mapped[str] = mapped_column(Text, default="{}")
    version: Mapped[int] = mapped_column(Integer, default=1)
    source: Mapped[str] = mapped_column(String(64), default="rules_v1")
    confidence: Mapped[str] = mapped_column(String(16), default="low")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CandidateCareerDirection(Base):
    """Career direction path suggestion — specialist / EM / product / etc."""

    __tablename__ = "candidate_career_directions"
    __table_args__ = (
        UniqueConstraint("candidate_id", "path_key", name="uq_career_direction_path_key"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(
        ForeignKey("candidates.id", ondelete="CASCADE"), index=True
    )
    path_key: Mapped[str] = mapped_column(String(64))
    title: Mapped[str] = mapped_column(String(200))
    status: Mapped[str] = mapped_column(String(32), default="suggested")
    probability: Mapped[float | None] = mapped_column(Float, nullable=True)
    effort: Mapped[str | None] = mapped_column(String(32), nullable=True)
    risk: Mapped[str | None] = mapped_column(String(32), nullable=True)
    timeline_months: Mapped[int | None] = mapped_column(Integer, nullable=True)
    market_demand: Mapped[str | None] = mapped_column(String(32), nullable=True)
    salary_trend: Mapped[str | None] = mapped_column(String(32), nullable=True)
    confidence: Mapped[str] = mapped_column(String(16), default="low")
    evidence_json: Mapped[str] = mapped_column(Text, default="[]")
    claims_json: Mapped[str] = mapped_column(Text, default="[]")
    payload_json: Mapped[str] = mapped_column(Text, default="{}")
    is_selected: Mapped[bool] = mapped_column(Boolean, default=False)
    rejected_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class CandidateCareerGoal(Base):
    """Persistent career goals with progress history."""

    __tablename__ = "candidate_career_goals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(
        ForeignKey("candidates.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(300))
    goal_type: Mapped[str] = mapped_column(String(64), default="career")
    status: Mapped[str] = mapped_column(String(32), default="active", index=True)
    target_role: Mapped[str | None] = mapped_column(String(200), nullable=True)
    target_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    progress_percent: Mapped[int] = mapped_column(Integer, default=0)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    history_json: Mapped[str] = mapped_column(Text, default="[]")
    paused_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class CandidateCareerAction(Base):
    """Action planner roadmap items (week/month/quarter horizons)."""

    __tablename__ = "candidate_career_actions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(
        ForeignKey("candidates.id", ondelete="CASCADE"), index=True
    )
    goal_id: Mapped[int | None] = mapped_column(
        ForeignKey("candidate_career_goals.id", ondelete="SET NULL"), nullable=True
    )
    horizon: Mapped[str] = mapped_column(String(32), default="month1", index=True)
    title: Mapped[str] = mapped_column(String(300))
    status: Mapped[str] = mapped_column(String(32), default="planned")
    effort: Mapped[str | None] = mapped_column(String(32), nullable=True)
    priority: Mapped[int] = mapped_column(Integer, default=50)
    dependency: Mapped[str | None] = mapped_column(String(200), nullable=True)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    impact: Mapped[str | None] = mapped_column(String(64), nullable=True)
    confidence: Mapped[str] = mapped_column(String(16), default="medium")
    claim_kind: Mapped[str] = mapped_column(String(32), default="SUGGESTION")
    source: Mapped[str] = mapped_column(String(64), default="copilot")
    payload_json: Mapped[str] = mapped_column(Text, default="{}")
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class CandidateCopilotRecommendation(Base):
    """Recommendation memory — never silently overwrite history."""

    __tablename__ = "candidate_copilot_recommendations"
    __table_args__ = (
        UniqueConstraint("candidate_id", "rec_key", name="uq_copilot_rec_key"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(
        ForeignKey("candidates.id", ondelete="CASCADE"), index=True
    )
    rec_key: Mapped[str] = mapped_column(String(128))
    kind: Mapped[str] = mapped_column(String(64), default="direction")
    title: Mapped[str] = mapped_column(String(300))
    status: Mapped[str] = mapped_column(String(32), default="suggested")
    claim_kind: Mapped[str] = mapped_column(String(32), default="SUGGESTION")
    confidence: Mapped[str] = mapped_column(String(16), default="low")
    evidence_json: Mapped[str] = mapped_column(Text, default="[]")
    payload_json: Mapped[str] = mapped_column(Text, default="{}")
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    rejected_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    ignored_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class CandidateCareerDecision(Base):
    """Decision simulator comparison snapshots."""

    __tablename__ = "candidate_career_decisions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(
        ForeignKey("candidates.id", ondelete="CASCADE"), index=True
    )
    scenario_key: Mapped[str] = mapped_column(String(64))
    title: Mapped[str] = mapped_column(String(200))
    comparison_json: Mapped[str] = mapped_column(Text, default="{}")
    confidence: Mapped[str] = mapped_column(String(16), default="low")
    claims_json: Mapped[str] = mapped_column(Text, default="[]")
    user_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class CandidateCareerReflection(Base):
    """Reflection engine entries after milestones."""

    __tablename__ = "candidate_career_reflections"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(
        ForeignKey("candidates.id", ondelete="CASCADE"), index=True
    )
    milestone_ref: Mapped[str | None] = mapped_column(String(128), nullable=True)
    body_json: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CandidateCopilotMemory(Base):
    """Long-term adaptive memory — versioned, never silently overwritten."""

    __tablename__ = "candidate_copilot_memories"
    __table_args__ = (
        UniqueConstraint("candidate_id", "memory_key", "version", name="uq_copilot_memory_ver"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(
        ForeignKey("candidates.id", ondelete="CASCADE"), index=True
    )
    memory_key: Mapped[str] = mapped_column(String(128))
    kind: Mapped[str] = mapped_column(String(64), default="event", index=True)
    title: Mapped[str] = mapped_column(String(300))
    body_json: Mapped[str] = mapped_column(Text, default="{}")
    source: Mapped[str] = mapped_column(String(64), default="copilot")
    confidence: Mapped[str] = mapped_column(String(16), default="medium")
    claim_kind: Mapped[str] = mapped_column(String(32), default="FACT")
    version: Mapped[int] = mapped_column(Integer, default=1)
    superseded_by_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    edited_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class CandidateCopilotPreference(Base):
    """Inferred/explicit preferences — never protected attributes."""

    __tablename__ = "candidate_copilot_preferences"
    __table_args__ = (UniqueConstraint("candidate_id", "pref_key", name="uq_copilot_pref_key"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(
        ForeignKey("candidates.id", ondelete="CASCADE"), index=True
    )
    pref_key: Mapped[str] = mapped_column(String(64))
    value_json: Mapped[str] = mapped_column(Text, default="{}")
    confidence: Mapped[str] = mapped_column(String(16), default="low")
    evidence_json: Mapped[str] = mapped_column(Text, default="[]")
    claim_kind: Mapped[str] = mapped_column(String(32), default="INFERENCE")
    editable: Mapped[bool] = mapped_column(Boolean, default=True)
    user_override: Mapped[bool] = mapped_column(Boolean, default=False)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class CandidateCareerTimelineEvent(Base):
    """Persistent career timeline across goals/apps/decisions/learning."""

    __tablename__ = "candidate_career_timeline_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(
        ForeignKey("candidates.id", ondelete="CASCADE"), index=True
    )
    event_type: Mapped[str] = mapped_column(String(64))
    title: Mapped[str] = mapped_column(String(300))
    payload_json: Mapped[str] = mapped_column(Text, default="{}")
    claim_kind: Mapped[str] = mapped_column(String(32), default="FACT")
    occurred_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CandidateSkillEvolution(Base):
    """Skill gaining/stagnation/decay signals — never fabricate evidence."""

    __tablename__ = "candidate_skill_evolution"
    __table_args__ = (UniqueConstraint("candidate_id", "skill", name="uq_skill_evolution_skill"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(
        ForeignKey("candidates.id", ondelete="CASCADE"), index=True
    )
    skill: Mapped[str] = mapped_column(String(120))
    status: Mapped[str] = mapped_column(String(32), default="unknown")
    evidence_json: Mapped[str] = mapped_column(Text, default="[]")
    next_exercise: Mapped[str | None] = mapped_column(String(300), nullable=True)
    confidence: Mapped[str] = mapped_column(String(16), default="low")
    claim_kind: Mapped[str] = mapped_column(String(32), default="INFERENCE")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CandidateCareerHealthSnapshot(Base):
    """Explainable multi-dimension career health score."""

    __tablename__ = "candidate_career_health_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(
        ForeignKey("candidates.id", ondelete="CASCADE"), index=True
    )
    overall_score: Mapped[int] = mapped_column(Integer, default=0)
    dimensions_json: Mapped[str] = mapped_column(Text, default="{}")
    explanations_json: Mapped[str] = mapped_column(Text, default="{}")
    confidence: Mapped[str] = mapped_column(String(16), default="low")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CandidateLearningLoopEntry(Base):
    """Post-milestone learning loop — useful? correct? surprise? improve?"""

    __tablename__ = "candidate_learning_loop_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(
        ForeignKey("candidates.id", ondelete="CASCADE"), index=True
    )
    milestone_ref: Mapped[str | None] = mapped_column(String(128), nullable=True)
    useful: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    prediction_correct: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    surprise: Mapped[str | None] = mapped_column(Text, nullable=True)
    improve_reasoning: Mapped[str | None] = mapped_column(Text, nullable=True)
    payload_json: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CandidateCareerScenario(Base):
    """Unlimited scenario comparisons (Job A/B, Stay, Abroad, Freelance…)."""

    __tablename__ = "candidate_career_scenarios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(
        ForeignKey("candidates.id", ondelete="CASCADE"), index=True
    )
    scenario_key: Mapped[str] = mapped_column(String(64))
    title: Mapped[str] = mapped_column(String(200))
    comparison_json: Mapped[str] = mapped_column(Text, default="{}")
    confidence: Mapped[str] = mapped_column(String(16), default="low")
    claims_json: Mapped[str] = mapped_column(Text, default="[]")
    ranking_explain_json: Mapped[str] = mapped_column(Text, default="{}")
    archived_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class CandidateDailyBrief(Base):
    """Persistent personalized daily career brief — dismissible/snoozable."""

    __tablename__ = "candidate_daily_briefs"
    __table_args__ = (UniqueConstraint("candidate_id", "brief_date", name="uq_daily_brief_date"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(
        ForeignKey("candidates.id", ondelete="CASCADE"), index=True
    )
    brief_date: Mapped[str] = mapped_column(String(10))
    status: Mapped[str] = mapped_column(String(32), default="active")
    headline: Mapped[str] = mapped_column(String(300), default="")
    body_json: Mapped[str] = mapped_column(Text, default="{}")
    context_version: Mapped[int] = mapped_column(Integer, default=1)
    snoozed_until: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    dismissed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class CandidateCareerChangeEvent(Base):
    """Evidence-only change detection (NEW/IMPROVED/DECLINED/STALE/…)."""

    __tablename__ = "candidate_career_change_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(
        ForeignKey("candidates.id", ondelete="CASCADE"), index=True
    )
    change_kind: Mapped[str] = mapped_column(String(32))
    entity_type: Mapped[str] = mapped_column(String(64))
    entity_key: Mapped[str] = mapped_column(String(128))
    title: Mapped[str] = mapped_column(String(300))
    before_json: Mapped[str] = mapped_column(Text, default="{}")
    after_json: Mapped[str] = mapped_column(Text, default="{}")
    evidence_json: Mapped[str] = mapped_column(Text, default="[]")
    claim_kind: Mapped[str] = mapped_column(String(32), default="FACT")
    confidence: Mapped[str] = mapped_column(String(16), default="medium")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CandidateCareerInboxItem(Base):
    """Career inbox — NEW/SEEN/PINNED/SNOOZED/COMPLETED/DISMISSED/ARCHIVED."""

    __tablename__ = "candidate_career_inbox_items"
    __table_args__ = (UniqueConstraint("candidate_id", "item_key", name="uq_career_inbox_item_key"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(
        ForeignKey("candidates.id", ondelete="CASCADE"), index=True
    )
    item_key: Mapped[str] = mapped_column(String(128))
    kind: Mapped[str] = mapped_column(String(64))
    title: Mapped[str] = mapped_column(String(300))
    body_json: Mapped[str] = mapped_column(Text, default="{}")
    status: Mapped[str] = mapped_column(String(32), default="NEW", index=True)
    priority_score: Mapped[int] = mapped_column(Integer, default=50)
    priority_explain_json: Mapped[str] = mapped_column(Text, default="{}")
    deep_link: Mapped[str | None] = mapped_column(String(300), nullable=True)
    effort: Mapped[str | None] = mapped_column(String(32), nullable=True)
    completion_criterion: Mapped[str | None] = mapped_column(String(300), nullable=True)
    claim_kind: Mapped[str] = mapped_column(String(32), default="SUGGESTION")
    confidence: Mapped[str] = mapped_column(String(16), default="medium")
    snoozed_until: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_surfaced_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    pinned: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class CandidateCareerInboxAudit(Base):
    """Append-only audit for inbox mutations."""

    __tablename__ = "candidate_career_inbox_audits"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(
        ForeignKey("candidates.id", ondelete="CASCADE"), index=True
    )
    inbox_item_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    action: Mapped[str] = mapped_column(String(64))
    payload_json: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CandidateCareerReminder(Base):
    """In-product reminders; email only with explicit opt-in + existing consent path."""

    __tablename__ = "candidate_career_reminders"
    __table_args__ = (
        UniqueConstraint("candidate_id", "idempotency_key", name="uq_career_reminder_idem"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(
        ForeignKey("candidates.id", ondelete="CASCADE"), index=True
    )
    reminder_key: Mapped[str] = mapped_column(String(128))
    title: Mapped[str] = mapped_column(String(300))
    due_at: Mapped[datetime] = mapped_column(DateTime)
    channel: Mapped[str] = mapped_column(String(32), default="in_product")
    status: Mapped[str] = mapped_column(String(32), default="scheduled")
    idempotency_key: Mapped[str] = mapped_column(String(128))
    payload_json: Mapped[str] = mapped_column(Text, default="{}")
    sent_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CandidateOpportunityWatch(Base):
    """Watchlist for roles/companies/industries/locations/skills/directions."""

    __tablename__ = "candidate_opportunity_watchlist"
    __table_args__ = (UniqueConstraint("candidate_id", "watch_key", name="uq_watchlist_key"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(
        ForeignKey("candidates.id", ondelete="CASCADE"), index=True
    )
    watch_key: Mapped[str] = mapped_column(String(128))
    watch_type: Mapped[str] = mapped_column(String(64))
    label: Mapped[str] = mapped_column(String(200))
    criteria_json: Mapped[str] = mapped_column(Text, default="{}")
    last_snapshot_json: Mapped[str] = mapped_column(Text, default="{}")
    freshness: Mapped[str] = mapped_column(String(32), default="UNKNOWN")
    archived_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class CandidateDailyCadence(Base):
    """Personal operating cadence — timezone, quiet hours, intensity, caps."""

    __tablename__ = "candidate_daily_cadence"
    __table_args__ = (UniqueConstraint("candidate_id", name="uq_daily_cadence_candidate"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(
        ForeignKey("candidates.id", ondelete="CASCADE"), unique=True
    )
    timezone: Mapped[str] = mapped_column(String(64), default="UTC")
    quiet_hours_start: Mapped[int | None] = mapped_column(Integer, nullable=True)
    quiet_hours_end: Mapped[int | None] = mapped_column(Integer, nullable=True)
    intensity: Mapped[str] = mapped_column(String(32), default="normal")
    quiet_mode: Mapped[bool] = mapped_column(Boolean, default=False)
    paused_modules_json: Mapped[str] = mapped_column(Text, default="[]")
    daily_cap: Mapped[int] = mapped_column(Integer, default=7)
    cooldown_hours: Mapped[int] = mapped_column(Integer, default=24)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CandidateDailyPrivacySettings(Base):
    """Daily OS privacy — disable learning/briefs/reminders; audited via inbox audits."""

    __tablename__ = "candidate_daily_privacy_settings"
    __table_args__ = (UniqueConstraint("candidate_id", name="uq_daily_privacy_candidate"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(
        ForeignKey("candidates.id", ondelete="CASCADE"), unique=True
    )
    learning_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    briefs_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    reminders_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    email_reminders_opt_in: Mapped[bool] = mapped_column(Boolean, default=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CandidateRecommendationWeights(Base):
    """Versioned recommendation calibration weights — no unvalidated AI-improve claims."""

    __tablename__ = "candidate_recommendation_weights"
    __table_args__ = (UniqueConstraint("candidate_id", "version", name="uq_rec_weights_ver"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(
        ForeignKey("candidates.id", ondelete="CASCADE"), index=True
    )
    version: Mapped[int] = mapped_column(Integer, default=1)
    weights_json: Mapped[str] = mapped_column(Text, default="{}")
    source: Mapped[str] = mapped_column(String(64), default="baseline")
    evidence_json: Mapped[str] = mapped_column(Text, default="[]")
    archived_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CandidateMomentumSnapshot(Base):
    """Evidence-backed career momentum — UNKNOWN ok; no fake gamification."""

    __tablename__ = "candidate_momentum_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(
        ForeignKey("candidates.id", ondelete="CASCADE"), index=True
    )
    score: Mapped[int] = mapped_column(Integer, default=0)
    dimensions_json: Mapped[str] = mapped_column(Text, default="{}")
    explain_json: Mapped[str] = mapped_column(Text, default="{}")
    confidence: Mapped[str] = mapped_column(String(16), default="low")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CandidateProgressReview(Base):
    """Weekly/monthly progress review — user must approve goal/strategy changes."""

    __tablename__ = "candidate_progress_reviews"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(
        ForeignKey("candidates.id", ondelete="CASCADE"), index=True
    )
    period: Mapped[str] = mapped_column(String(16))
    summary_json: Mapped[str] = mapped_column(Text, default="{}")
    proposed_changes_json: Mapped[str] = mapped_column(Text, default="[]")
    user_approved: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CandidateAcceptanceOutcome(Base):
    """Candidate-defined acceptance outcome — never a hiring certainty claim."""

    __tablename__ = "candidate_acceptance_outcomes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(
        ForeignKey("candidates.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(300))
    description: Mapped[str] = mapped_column(Text, default="")
    target_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="active")
    claim_kind: Mapped[str] = mapped_column(String(32), default="SUGGESTION")
    version: Mapped[int] = mapped_column(Integer, default=1)
    evidence_json: Mapped[str] = mapped_column(Text, default="[]")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class CandidateTimeBudget(Base):
    """Explicit time budget only — never infer private obligations."""

    __tablename__ = "candidate_time_budgets"
    __table_args__ = (UniqueConstraint("candidate_id", name="uq_time_budget_candidate"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(
        ForeignKey("candidates.id", ondelete="CASCADE"), unique=True
    )
    timezone: Mapped[str] = mapped_column(String(64), default="UTC")
    hours_per_week: Mapped[int] = mapped_column(Integer, default=10)
    hours_per_day_cap: Mapped[int | None] = mapped_column(Integer, nullable=True)
    protected_blocks_json: Mapped[str] = mapped_column(Text, default="[]")
    note: Mapped[str] = mapped_column(Text, default="")
    version: Mapped[int] = mapped_column(Integer, default=1)
    source: Mapped[str] = mapped_column(String(32), default="explicit_user")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CandidateCalendarConsent(Base):
    """Per-capability calendar consent — no bundled hidden opt-in."""

    __tablename__ = "candidate_calendar_consents"
    __table_args__ = (UniqueConstraint("candidate_id", name="uq_calendar_consent_candidate"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(
        ForeignKey("candidates.id", ondelete="CASCADE"), unique=True
    )
    internal_calendar_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    ms_busy_read_opt_in: Mapped[bool] = mapped_column(Boolean, default=False)
    google_busy_read_opt_in: Mapped[bool] = mapped_column(Boolean, default=False)
    ics_export_opt_in: Mapped[bool] = mapped_column(Boolean, default=True)
    store_availability_blocks: Mapped[bool] = mapped_column(Boolean, default=False)
    version: Mapped[int] = mapped_column(Integer, default=1)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CandidateCalendarPreference(Base):
    """Versioned calendar preference weights from explicit feedback."""

    __tablename__ = "candidate_calendar_preferences"
    __table_args__ = (UniqueConstraint("candidate_id", "version", name="uq_cal_prefs_ver"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(
        ForeignKey("candidates.id", ondelete="CASCADE"), index=True
    )
    version: Mapped[int] = mapped_column(Integer)
    prefs_json: Mapped[str] = mapped_column(Text, default="{}")
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    source: Mapped[str] = mapped_column(String(64), default="user_feedback")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CandidateAcceptanceItem(Base):
    """Unified Acceptance Calendar item — internal planning only; no external auto-write."""

    __tablename__ = "candidate_acceptance_items"
    __table_args__ = (UniqueConstraint("candidate_id", "item_key", name="uq_acceptance_item_key"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(
        ForeignKey("candidates.id", ondelete="CASCADE"), index=True
    )
    item_key: Mapped[str] = mapped_column(String(160))
    category: Mapped[str] = mapped_column(String(48))
    state: Mapped[str] = mapped_column(String(48), default="proposed")
    title: Mapped[str] = mapped_column(String(300))
    summary: Mapped[str] = mapped_column(Text, default="")
    importance: Mapped[int] = mapped_column(Integer, default=50)
    claim_kind: Mapped[str] = mapped_column(String(32), default="UNKNOWN")
    confidence: Mapped[str] = mapped_column(String(16), default="medium")
    starts_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    ends_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    due_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, index=True)
    timezone: Mapped[str] = mapped_column(String(64), default="UTC")
    duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    source_type: Mapped[str] = mapped_column(String(64), default="internal")
    source_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    outcome_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    deep_link: Mapped[str | None] = mapped_column(String(300), nullable=True)
    evidence_json: Mapped[str] = mapped_column(Text, default="[]")
    payload_json: Mapped[str] = mapped_column(Text, default="{}")
    version: Mapped[int] = mapped_column(Integer, default=1)
    at_risk: Mapped[bool] = mapped_column(Boolean, default=False)
    protected: Mapped[bool] = mapped_column(Boolean, default=False)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class CandidateProposedHold(Base):
    """Proposed time hold — DRAFT→…; never auto-creates external calendar events."""

    __tablename__ = "candidate_proposed_holds"
    __table_args__ = (UniqueConstraint("candidate_id", "hold_key", name="uq_proposed_hold_key"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(
        ForeignKey("candidates.id", ondelete="CASCADE"), index=True
    )
    hold_key: Mapped[str] = mapped_column(String(160))
    title: Mapped[str] = mapped_column(String(300))
    status: Mapped[str] = mapped_column(String(32), default="DRAFT")
    starts_at: Mapped[datetime] = mapped_column(DateTime)
    ends_at: Mapped[datetime] = mapped_column(DateTime)
    timezone: Mapped[str] = mapped_column(String(64), default="UTC")
    why_json: Mapped[str] = mapped_column(Text, default="{}")
    alternatives_json: Mapped[str] = mapped_column(Text, default="[]")
    item_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    claim_kind: Mapped[str] = mapped_column(String(32), default="SUGGESTION")
    external_created: Mapped[bool] = mapped_column(Boolean, default=False)
    version: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class CandidateAvailabilityBlock(Base):
    """Normalized busy blocks only — no event titles/attendees stored."""

    __tablename__ = "candidate_availability_blocks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(
        ForeignKey("candidates.id", ondelete="CASCADE"), index=True
    )
    provider: Mapped[str] = mapped_column(String(32))
    starts_at: Mapped[datetime] = mapped_column(DateTime)
    ends_at: Mapped[datetime] = mapped_column(DateTime)
    busy: Mapped[bool] = mapped_column(Boolean, default=True)
    source: Mapped[str] = mapped_column(String(32), default="synthetic")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CandidateWeeklyPlan(Base):
    """Weekly planning strategy — strategy changes require explicit approval."""

    __tablename__ = "candidate_weekly_plans"
    __table_args__ = (
        UniqueConstraint("candidate_id", "week_start", "version", name="uq_weekly_plan_ver"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(
        ForeignKey("candidates.id", ondelete="CASCADE"), index=True
    )
    week_start: Mapped[str] = mapped_column(String(10))
    strategy_json: Mapped[str] = mapped_column(Text, default="{}")
    user_approved: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CandidateAcceptanceItemAudit(Base):
    """Append-only audit for Acceptance Calendar edits (reversible history)."""

    __tablename__ = "candidate_acceptance_item_audits"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(
        ForeignKey("candidates.id", ondelete="CASCADE"), index=True
    )
    item_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    action: Mapped[str] = mapped_column(String(64))
    before_json: Mapped[str] = mapped_column(Text, default="{}")
    after_json: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CandidateEvidenceSource(Base):
    """Registry of CVs, uploads, notes, drafts — TWIN drafts are not proof alone."""

    __tablename__ = "candidate_evidence_sources"
    __table_args__ = (UniqueConstraint("candidate_id", "source_key", name="uq_evidence_source_key"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(
        ForeignKey("candidates.id", ondelete="CASCADE"), index=True
    )
    source_key: Mapped[str] = mapped_column(String(160))
    source_kind: Mapped[str] = mapped_column(String(64))
    title: Mapped[str] = mapped_column(String(300), default="")
    location_ref: Mapped[str | None] = mapped_column(String(500), nullable=True)
    content_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    mime_type: Mapped[str | None] = mapped_column(String(120), nullable=True)
    byte_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    supersedes_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="active")
    is_synthetic: Mapped[bool] = mapped_column(Boolean, default=False)
    kpi_excluded: Mapped[bool] = mapped_column(Boolean, default=True)
    payload_json: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class CandidateCareerEvidence(Base):
    """Canonical career evidence item — source-backed, never invents achievements."""

    __tablename__ = "candidate_career_evidence"
    __table_args__ = (UniqueConstraint("candidate_id", "evidence_key", name="uq_career_evidence_key"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(
        ForeignKey("candidates.id", ondelete="CASCADE"), index=True
    )
    evidence_key: Mapped[str] = mapped_column(String(160))
    evidence_type: Mapped[str] = mapped_column(String(64))
    title: Mapped[str] = mapped_column(String(300))
    summary: Mapped[str] = mapped_column(Text, default="")
    context_json: Mapped[str] = mapped_column(Text, default="{}")
    action_json: Mapped[str] = mapped_column(Text, default="{}")
    result_json: Mapped[str] = mapped_column(Text, default="{}")
    metrics_json: Mapped[str] = mapped_column(Text, default="[]")
    technologies_json: Mapped[str] = mapped_column(Text, default="[]")
    skills_json: Mapped[str] = mapped_column(Text, default="[]")
    target_roles_json: Mapped[str] = mapped_column(Text, default="[]")
    source_ids_json: Mapped[str] = mapped_column(Text, default="[]")
    claim_kind: Mapped[str] = mapped_column(String(32), default="UNKNOWN")
    quality: Mapped[str] = mapped_column(String(32), default="UNKNOWN")
    quality_explain_json: Mapped[str] = mapped_column(Text, default="{}")
    confidence: Mapped[str] = mapped_column(String(16), default="low")
    confidentiality: Mapped[str] = mapped_column(String(40), default="PRIVATE")
    external_usability: Mapped[str] = mapped_column(String(40), default="PRIVATE")
    verification_state: Mapped[str] = mapped_column(String(40), default="UNCONFIRMED")
    status: Mapped[str] = mapped_column(String(32), default="draft")
    version: Mapped[int] = mapped_column(Integer, default=1)
    is_synthetic: Mapped[bool] = mapped_column(Boolean, default=False)
    kpi_excluded: Mapped[bool] = mapped_column(Boolean, default=True)
    occurred_from: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    occurred_to: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    redacted_of_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    supersedes_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    payload_json: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    archived_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class CandidateEvidenceField(Base):
    """Field-level confirmation history for career evidence."""

    __tablename__ = "candidate_evidence_fields"
    __table_args__ = (UniqueConstraint("evidence_id", "field_name", name="uq_evidence_field_name"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(
        ForeignKey("candidates.id", ondelete="CASCADE"), index=True
    )
    evidence_id: Mapped[int] = mapped_column(
        ForeignKey("candidate_career_evidence.id", ondelete="CASCADE")
    )
    field_name: Mapped[str] = mapped_column(String(80))
    field_value_json: Mapped[str] = mapped_column(Text, default="null")
    claim_kind: Mapped[str] = mapped_column(String(32), default="UNKNOWN")
    confirmation: Mapped[str] = mapped_column(String(32), default="pending")
    source_location: Mapped[str | None] = mapped_column(String(500), nullable=True)
    confidence: Mapped[str] = mapped_column(String(16), default="low")
    version: Mapped[int] = mapped_column(Integer, default=1)
    history_json: Mapped[str] = mapped_column(Text, default="[]")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CandidateEvidenceClaim(Base):
    """Claims with consistency classification — never auto-resolve material conflicts."""

    __tablename__ = "candidate_evidence_claims"
    __table_args__ = (UniqueConstraint("candidate_id", "claim_key", name="uq_evidence_claim_key"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(
        ForeignKey("candidates.id", ondelete="CASCADE"), index=True
    )
    evidence_id: Mapped[int | None] = mapped_column(
        ForeignKey("candidate_career_evidence.id", ondelete="CASCADE"), nullable=True
    )
    claim_key: Mapped[str] = mapped_column(String(160))
    statement: Mapped[str] = mapped_column(Text)
    claim_kind: Mapped[str] = mapped_column(String(32), default="INFERENCE")
    consistency: Mapped[str] = mapped_column(String(32), default="UNKNOWN")
    conflict_with_json: Mapped[str] = mapped_column(Text, default="[]")
    source_ids_json: Mapped[str] = mapped_column(Text, default="[]")
    status: Mapped[str] = mapped_column(String(32), default="open")
    version: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class CandidateEvidenceSkillLink(Base):
    """Skill↔evidence link — never claims mastery from one mention."""

    __tablename__ = "candidate_evidence_skill_links"
    __table_args__ = (UniqueConstraint("evidence_id", "skill", name="uq_evidence_skill_link"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(
        ForeignKey("candidates.id", ondelete="CASCADE"), index=True
    )
    evidence_id: Mapped[int] = mapped_column(
        ForeignKey("candidate_career_evidence.id", ondelete="CASCADE")
    )
    skill: Mapped[str] = mapped_column(String(120))
    link_state: Mapped[str] = mapped_column(String(40), default="CLAIM_ONLY")
    claim_kind: Mapped[str] = mapped_column(String(32), default="INFERENCE")
    mastery_claim: Mapped[bool] = mapped_column(Boolean, default=False)
    evidence_explain_json: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CandidatePortfolioProject(Base):
    """Private portfolio project — never public by default."""

    __tablename__ = "candidate_portfolio_projects"
    __table_args__ = (UniqueConstraint("candidate_id", "project_key", name="uq_portfolio_project_key"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(
        ForeignKey("candidates.id", ondelete="CASCADE"), index=True
    )
    project_key: Mapped[str] = mapped_column(String(160))
    title: Mapped[str] = mapped_column(String(300))
    external_safe_title: Mapped[str | None] = mapped_column(String(300), nullable=True)
    body_json: Mapped[str] = mapped_column(Text, default="{}")
    evidence_ids_json: Mapped[str] = mapped_column(Text, default="[]")
    skills_json: Mapped[str] = mapped_column(Text, default="[]")
    confidentiality: Mapped[str] = mapped_column(String(40), default="PRIVATE")
    status: Mapped[str] = mapped_column(String(32), default="draft")
    is_public: Mapped[bool] = mapped_column(Boolean, default=False)
    version: Mapped[int] = mapped_column(Integer, default=1)
    kpi_excluded: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class CandidateInterviewStory(Base):
    """Evidence-backed STAR/CAR interview story — never fabricated."""

    __tablename__ = "candidate_interview_stories"
    __table_args__ = (UniqueConstraint("candidate_id", "story_key", name="uq_interview_story_key"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(
        ForeignKey("candidates.id", ondelete="CASCADE"), index=True
    )
    story_key: Mapped[str] = mapped_column(String(160))
    theme: Mapped[str] = mapped_column(String(64))
    framework: Mapped[str] = mapped_column(String(16), default="STAR")
    title: Mapped[str] = mapped_column(String(300))
    body_json: Mapped[str] = mapped_column(Text, default="{}")
    evidence_ids_json: Mapped[str] = mapped_column(Text, default="[]")
    claim_kind: Mapped[str] = mapped_column(String(32), default="SUGGESTION")
    status: Mapped[str] = mapped_column(String(32), default="draft")
    version: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class CandidateCvBulletDraft(Base):
    """Evidence-backed CV bullet draft — never silently rewrites canonical CV."""

    __tablename__ = "candidate_cv_bullet_drafts"
    __table_args__ = (UniqueConstraint("candidate_id", "bullet_key", name="uq_cv_bullet_key"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(
        ForeignKey("candidates.id", ondelete="CASCADE"), index=True
    )
    bullet_key: Mapped[str] = mapped_column(String(160))
    source_bullet: Mapped[str | None] = mapped_column(Text, nullable=True)
    draft_text: Mapped[str] = mapped_column(Text)
    audit_status: Mapped[str] = mapped_column(String(40), default="needs_rewrite")
    evidence_ids_json: Mapped[str] = mapped_column(Text, default="[]")
    claim_kind: Mapped[str] = mapped_column(String(32), default="SUGGESTION")
    approved: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    target_role: Mapped[str | None] = mapped_column(String(200), nullable=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class CandidateApplicationEvidencePack(Base):
    """Private application evidence pack — no auto-submit / external send."""

    __tablename__ = "candidate_application_evidence_packs"
    __table_args__ = (
        UniqueConstraint("candidate_id", "pack_key", name="uq_app_evidence_pack_key"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(
        ForeignKey("candidates.id", ondelete="CASCADE"), index=True
    )
    application_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    pack_key: Mapped[str] = mapped_column(String(160))
    title: Mapped[str] = mapped_column(String(300))
    body_json: Mapped[str] = mapped_column(Text, default="{}")
    fit_kind: Mapped[str] = mapped_column(String(40), default="UNKNOWN")
    evidence_ids_json: Mapped[str] = mapped_column(Text, default="[]")
    gaps_json: Mapped[str] = mapped_column(Text, default="[]")
    auto_submit: Mapped[bool] = mapped_column(Boolean, default=False)
    version: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class CandidateEvidencePrivacy(Base):
    """Evidence processing privacy — no hidden cross-application reuse."""

    __tablename__ = "candidate_evidence_privacy"
    __table_args__ = (UniqueConstraint("candidate_id", name="uq_evidence_privacy_candidate"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(
        ForeignKey("candidates.id", ondelete="CASCADE"), unique=True
    )
    ai_extraction_opt_in: Mapped[bool] = mapped_column(Boolean, default=False)
    drafting_opt_in: Mapped[bool] = mapped_column(Boolean, default=True)
    memory_reuse_opt_in: Mapped[bool] = mapped_column(Boolean, default=True)
    portfolio_inclusion_default: Mapped[str] = mapped_column(String(40), default="PRIVATE")
    export_include_confidential: Mapped[bool] = mapped_column(Boolean, default=False)
    paused: Mapped[bool] = mapped_column(Boolean, default=False)
    version: Mapped[int] = mapped_column(Integer, default=1)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CandidateEvidenceAudit(Base):
    """Append-only audit for evidence/portfolio mutations."""

    __tablename__ = "candidate_evidence_audits"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(
        ForeignKey("candidates.id", ondelete="CASCADE"), index=True
    )
    entity_type: Mapped[str] = mapped_column(String(64))
    entity_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    action: Mapped[str] = mapped_column(String(64))
    before_json: Mapped[str] = mapped_column(Text, default="{}")
    after_json: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CandidateReferralProgram(Base):
    """One referral program per candidate — unique share code (Wave B slice 3)."""

    __tablename__ = "candidate_referral_programs"
    __table_args__ = (
        UniqueConstraint("candidate_id", name="uq_candidate_referral_programs_candidate_id"),
        UniqueConstraint("referral_code", name="uq_candidate_referral_programs_referral_code"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(
        ForeignKey("candidates.id", ondelete="CASCADE"),
        index=True,
        unique=True,
    )
    referral_code: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    candidate: Mapped["Candidate"] = relationship(back_populates="referral_program")
    referrals: Mapped[list["CandidateReferral"]] = relationship(
        back_populates="program",
        cascade="all, delete-orphan",
    )


class CandidateReferral(Base):
    """Tracked referral edge from candidate program — invite or signup attribution."""

    __tablename__ = "candidate_referrals"
    __table_args__ = (UniqueConstraint("referred_user_id", name="uq_candidate_referrals_referred_user_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    program_id: Mapped[int] = mapped_column(
        ForeignKey("candidate_referral_programs.id", ondelete="CASCADE"),
        index=True,
    )
    referred_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        unique=True,
    )
    invite_email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="pending")
    ref_code_used: Mapped[str | None] = mapped_column(String(32), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    signed_up_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    program: Mapped["CandidateReferralProgram"] = relationship(back_populates="referrals")


class CandidateConsentReceipt(Base):
    """Append-only consent receipt — issued on grant/withdraw."""

    __tablename__ = "candidate_consent_receipts"
    __table_args__ = (
        UniqueConstraint(
            "candidate_id",
            "idempotency_key",
            name="uq_candidate_consent_receipt_idempotency",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(ForeignKey("candidates.id", ondelete="CASCADE"), index=True)
    consent_purpose: Mapped[str] = mapped_column(String(64), index=True)
    action: Mapped[str] = mapped_column(String(32))
    status: Mapped[str] = mapped_column(String(32), default="issued")
    payload_json: Mapped[str] = mapped_column(Text, default="{}")
    idempotency_key: Mapped[str | None] = mapped_column(String(128), nullable=True)
    created_by_user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    candidate: Mapped["Candidate"] = relationship(back_populates="consent_receipts")


class CandidatePrivacyRequest(Base):
    """Candidate privacy request — manual processing; candidate cannot set completed."""

    __tablename__ = "candidate_privacy_requests"
    __table_args__ = (
        UniqueConstraint(
            "candidate_id",
            "idempotency_key",
            name="uq_candidate_privacy_request_idempotency",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(ForeignKey("candidates.id", ondelete="CASCADE"), index=True)
    request_type: Mapped[str] = mapped_column(String(64), index=True)
    status: Mapped[str] = mapped_column(String(32), default="open", index=True)
    payload_json: Mapped[str] = mapped_column(Text, default="{}")
    idempotency_key: Mapped[str | None] = mapped_column(String(128), nullable=True)
    created_by_user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    fulfillment_status: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    fulfilled_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    fulfilled_by_user_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    delivery_receipt_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    legal_hold: Mapped[bool] = mapped_column(Boolean, default=False)

    candidate: Mapped["Candidate"] = relationship(back_populates="privacy_requests")


class RecruiterSlaTarget(Base):
    """Per-company stage SLA target (hours) for recruiter analytics."""

    __tablename__ = "recruiter_sla_targets"
    __table_args__ = (
        UniqueConstraint("company_slug", "stage_key", name="uq_recruiter_sla_company_stage"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    company_slug: Mapped[str] = mapped_column(String(80), index=True)
    stage_key: Mapped[str] = mapped_column(String(64))
    target_hours: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class ImportedCalendarHold(Base):
    """Busy/hold slots imported from candidate-uploaded .ics (no external write)."""

    __tablename__ = "imported_calendar_holds"
    __table_args__ = (
        UniqueConstraint("user_id", "uid", name="uq_imported_calendar_hold_user_uid"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    uid: Mapped[str] = mapped_column(String(255))
    summary: Mapped[str | None] = mapped_column(String(500), nullable=True)
    starts_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    ends_at: Mapped[datetime] = mapped_column(DateTime)
    timezone: Mapped[str | None] = mapped_column(String(64), nullable=True)
    source: Mapped[str] = mapped_column(String(32), default="ics_import")
    raw_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class RecruiterCollaborationNote(Base):
    """Live recruiter collaboration notes — replaces demo-journey fixture boards."""

    __tablename__ = "recruiter_collaboration_notes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    company_slug: Mapped[str] = mapped_column(String(80), index=True)
    subject_type: Mapped[str] = mapped_column(String(32))
    subject_id: Mapped[str] = mapped_column(String(64))
    body: Mapped[str] = mapped_column(Text)
    author_label: Mapped[str | None] = mapped_column(String(128), nullable=True)
    created_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CandidateTrustAuditEvent(Base):
    """Append-only candidate trust audit trail — no update/delete."""

    __tablename__ = "candidate_trust_audit_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(ForeignKey("candidates.id", ondelete="CASCADE"), index=True)
    event_type: Mapped[str] = mapped_column(String(64), index=True)
    summary: Mapped[str] = mapped_column(String(500))
    metadata_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    actor: Mapped[str] = mapped_column(String(32), default="candidate")
    actor_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

    candidate: Mapped["Candidate"] = relationship(back_populates="trust_audit_events")


class RecruiterApplicationScorecard(Base):
    """Internal recruiter scorecard per application — not copied to audit trail."""

    __tablename__ = "recruiter_application_scorecards"
    __table_args__ = (
        UniqueConstraint("application_id", "company_slug", name="uq_recruiter_scorecard_app_company"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    application_id: Mapped[int] = mapped_column(
        ForeignKey("applications.id", ondelete="CASCADE"),
        index=True,
    )
    company_slug: Mapped[str] = mapped_column(String(80), index=True)
    rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )


class RecruiterDecisionMemoryEntry(Base):
    """Live recruiter decision memory — never demo-candidate fixtures as production truth."""

    __tablename__ = "recruiter_decision_memory_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    company_slug: Mapped[str] = mapped_column(String(80), index=True)
    subject_type: Mapped[str] = mapped_column(String(32))
    subject_id: Mapped[str] = mapped_column(String(64))
    application_id: Mapped[int | None] = mapped_column(
        ForeignKey("applications.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    decision_code: Mapped[str] = mapped_column(String(64))
    summary: Mapped[str] = mapped_column(String(500))
    rationale_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    source: Mapped[str] = mapped_column(String(32), default="live")
    demo_fixture: Mapped[bool] = mapped_column(Boolean, default=False)
    meta_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )


class RecruiterTalentPoolImport(Base):
    """Batch import of structured internal talent pool records (CSV paste MVP)."""

    __tablename__ = "recruiter_talent_pool_imports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    company_slug: Mapped[str] = mapped_column(String(80), index=True)
    import_source: Mapped[str] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(32), default="preview")
    row_count: Mapped[int] = mapped_column(Integer, default=0)
    accepted_count: Mapped[int] = mapped_column(Integer, default=0)
    duplicate_count: Mapped[int] = mapped_column(Integer, default=0)
    error_count: Mapped[int] = mapped_column(Integer, default=0)
    warnings_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    audit_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    committed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class RecruiterTalentPoolRecord(Base):
    """Structured internal talent pool row — company-scoped, no raw PII beyond display name."""

    __tablename__ = "recruiter_talent_pool_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    company_slug: Mapped[str] = mapped_column(String(80), index=True)
    import_id: Mapped[int | None] = mapped_column(
        ForeignKey("recruiter_talent_pool_imports.id", ondelete="SET NULL"),
        nullable=True,
    )
    candidate_id: Mapped[str | None] = mapped_column(String(64), index=True, nullable=True)
    application_id: Mapped[int | None] = mapped_column(Integer, index=True, nullable=True)
    job_id: Mapped[int | None] = mapped_column(Integer, index=True, nullable=True)
    external_ats_id: Mapped[str | None] = mapped_column(String(128), index=True, nullable=True)
    display_name: Mapped[str] = mapped_column(String(200))
    job_title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    location: Mapped[str | None] = mapped_column(String(120), nullable=True)
    seniority: Mapped[str | None] = mapped_column(String(64), nullable=True)
    skills_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    data_quality_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    duplicate_key: Mapped[str] = mapped_column(String(128), index=True)
    pipeline_status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    source_type: Mapped[str] = mapped_column(String(32), default="csv_import")
    snapshot_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, index=True)
    consent_visibility: Mapped[str] = mapped_column(String(32), default="unknown")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class RecruiterTrustReviewItem(Base):
    """Recruiter trust review queue item — consent-safe, company-scoped."""

    __tablename__ = "recruiter_trust_review_items"
    __table_args__ = (
        UniqueConstraint(
            "company_slug",
            "privacy_request_id",
            name="uq_recruiter_trust_review_company_privacy_request",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    company_slug: Mapped[str] = mapped_column(String(80), index=True)
    item_kind: Mapped[str] = mapped_column(String(64))
    subject_ref: Mapped[str] = mapped_column(String(128))
    privacy_request_id: Mapped[int | None] = mapped_column(
        ForeignKey("candidate_privacy_requests.id", ondelete="SET NULL"),
        nullable=True,
    )
    candidate_ref: Mapped[str | None] = mapped_column(String(64), nullable=True)
    reason_key: Mapped[str] = mapped_column(String(64))
    reason_summary: Mapped[str] = mapped_column(String(500))
    status: Mapped[str] = mapped_column(String(32), default="pending_review", index=True)
    priority: Mapped[str | None] = mapped_column(String(16), nullable=True)
    consent_state: Mapped[str] = mapped_column(String(32), default="unknown")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    decisions: Mapped[list["RecruiterTrustReviewDecision"]] = relationship(
        back_populates="item",
        cascade="all, delete-orphan",
        order_by="RecruiterTrustReviewDecision.created_at.desc()",
    )


class RecruiterTrustReviewDecision(Base):
    """Append-only recruiter trust review decision history."""

    __tablename__ = "recruiter_trust_review_decisions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    item_id: Mapped[int] = mapped_column(
        ForeignKey("recruiter_trust_review_items.id", ondelete="CASCADE"),
        index=True,
    )
    decision: Mapped[str] = mapped_column(String(32))
    note: Mapped[str | None] = mapped_column(String(500), nullable=True)
    actor_ref: Mapped[str] = mapped_column(String(120))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

    item: Mapped["RecruiterTrustReviewItem"] = relationship(back_populates="decisions")


class RecruiterNotificationPreferences(Base):
    """Per-company recruiter in-app notification toggles — Wave C3."""

    __tablename__ = "recruiter_notification_preferences"
    __table_args__ = (UniqueConstraint("company_slug", name="uq_recruiter_notification_prefs_company"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    company_slug: Mapped[str] = mapped_column(String(80), index=True)
    in_app_inbox_digest: Mapped[bool] = mapped_column(Boolean, default=True)
    in_app_interview_reminder: Mapped[bool] = mapped_column(Boolean, default=True)
    in_app_trust_review_alert: Mapped[bool] = mapped_column(Boolean, default=True)
    in_app_pipeline_update: Mapped[bool] = mapped_column(Boolean, default=True)
    updated_by_ref: Mapped[str | None] = mapped_column(String(120), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )


class RecruiterSavedView(Base):
    """Per-company saved filter views — Wave C4."""

    __tablename__ = "recruiter_saved_views"
    __table_args__ = (
        UniqueConstraint("company_slug", "surface", "name", name="uq_recruiter_saved_view_name"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    company_slug: Mapped[str] = mapped_column(String(80), index=True)
    surface: Mapped[str] = mapped_column(String(32), index=True)
    name: Mapped[str] = mapped_column(String(120))
    filter_json: Mapped[str] = mapped_column(Text)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )


class AutoApplyConsent(Base):
    """GDPR-style consent for nightly autonomous applications."""

    __tablename__ = "auto_apply_consents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(
        ForeignKey("candidates.id", ondelete="CASCADE"),
        unique=True,
        index=True,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    consent_given_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    consent_text_version: Mapped[str] = mapped_column(String(32), default="v1")
    min_score_threshold: Mapped[float] = mapped_column(Float, default=90.0)
    daily_limit: Mapped[int] = mapped_column(Integer, default=10)
    total_applications_submitted: Mapped[int] = mapped_column(Integer, default=0)
    last_run_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    candidate: Mapped["Candidate"] = relationship(back_populates="auto_apply_consent")


class AutoApplyRun(Base):
    """Audit log for scheduled nightly auto-apply sweeps."""

    __tablename__ = "auto_apply_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    started_at: Mapped[datetime] = mapped_column(DateTime)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    total_users_processed: Mapped[int] = mapped_column(Integer, default=0)
    total_applications_submitted: Mapped[int] = mapped_column(Integer, default=0)
    total_applications_failed: Mapped[int] = mapped_column(Integer, default=0)
    stats_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AutoApplyEvent(Base):
    """Lightweight audit for auto-apply rate limits and company cooldowns."""

    __tablename__ = "auto_apply_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("jobs.id", ondelete="CASCADE"), index=True)
    company_key: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    outcome: Mapped[str | None] = mapped_column(String(32), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class LinkedInViralIncentiveClaim(Base):
    """Placement-linked LinkedIn post bonus claim (tiered cents, reviewer workflow)."""

    __tablename__ = "linkedin_viral_incentive_claims"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    application_id: Mapped[int | None] = mapped_column(
        ForeignKey("applications.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    post_url: Mapped[str] = mapped_column(String(2048))
    word_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    has_offer_letter_photo: Mapped[bool] = mapped_column(Boolean, default=False)
    has_video_testimonial: Mapped[bool] = mapped_column(Boolean, default=False)
    screenshot_url_primary: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    screenshot_url_secondary: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    bonus_cents_calculated: Mapped[int] = mapped_column(Integer, default=0)
    bonus_currency: Mapped[str] = mapped_column(String(8), default="USD")
    status: Mapped[ViralClaimStatus] = mapped_column(Enum(ViralClaimStatus), default=ViralClaimStatus.DRAFT)
    reviewer_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    user: Mapped["User"] = relationship(back_populates="viral_incentive_claims")
    application: Mapped["Application | None"] = relationship(back_populates="viral_incentive_claims")


class ScheduledInterview(Base):
    """Interview blocks placed on the user's Google Calendar (and mirrored here)."""

    __tablename__ = "scheduled_interviews"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    application_id: Mapped[int | None] = mapped_column(
        ForeignKey("applications.id", ondelete="SET NULL"), nullable=True, index=True
    )
    company_name: Mapped[str] = mapped_column(String(255))
    job_title: Mapped[str] = mapped_column(String(255))
    interviewer_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    interviewer_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    interview_start: Mapped[datetime] = mapped_column(DateTime, index=True)
    interview_end: Mapped[datetime] = mapped_column(DateTime)
    timezone: Mapped[str] = mapped_column(String(50), default="UTC")
    calendar_event_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    calendar_provider: Mapped[str] = mapped_column(String(50), default="google")
    meeting_link: Mapped[str | None] = mapped_column(String(500), nullable=True)
    meeting_location: Mapped[str | None] = mapped_column(String(500), nullable=True)
    interview_type: Mapped[str] = mapped_column(String(50), default="video")
    status: Mapped[str] = mapped_column(String(50), default="scheduled")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    # Optional unauthenticated .ics download (hashed token; see calendar API).
    ics_access_token_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    ics_access_token_expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    reminder_email_sent_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    user: Mapped["User"] = relationship(back_populates="scheduled_interviews")
    application: Mapped["Application | None"] = relationship(back_populates="scheduled_interviews")


class RecruiterCompanyToken(Base):
    """Per-employer recruiter inbox token (scoped to one company_slug)."""

    __tablename__ = "recruiter_company_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    company_slug: Mapped[str] = mapped_column(String(80), index=True, nullable=False)
    label: Mapped[str] = mapped_column(String(120), nullable=False)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class PartnerApiKey(Base):
    """Hashed integrator tokens (scoped exports; minted via ops admin)."""

    __tablename__ = "partner_api_keys"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    label: Mapped[str] = mapped_column(String(120), nullable=False)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    scopes: Mapped[str] = mapped_column(String(255), default="export")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class EmployerLead(Base):
    """Inbound interest from company / employer signup forms (public lead capture)."""

    __tablename__ = "employer_leads"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    company_name: Mapped[str] = mapped_column(String(255), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ProductFeedback(Base):
    """In-app product feedback (distinct from recruiter application feedback)."""

    __tablename__ = "product_feedback"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    category: Mapped[str] = mapped_column(String(32))
    rating: Mapped[int] = mapped_column(Integer)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    page_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    # First-customer queue fields (additive; defaults keep old rows valid)
    feedback_type: Mapped[str] = mapped_column(String(32), default="suggestion", index=True)
    workflow_key: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    tags_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    priority: Mapped[str] = mapped_column(String(16), default="normal", index=True)
    status: Mapped[str] = mapped_column(String(32), default="open", index=True)
    assigned_to_label: Mapped[str | None] = mapped_column(String(120), nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="product_feedback")


class CompanyIntelligenceCache(Base):
    """Cached company research per company + role title (US-C051)."""

    __tablename__ = "company_intelligence_cache"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    company_name: Mapped[str] = mapped_column(String(200), index=True)
    job_title: Mapped[str] = mapped_column(String(200), index=True)
    intel_json: Mapped[str] = mapped_column(Text, nullable=False)
    researched_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class OptimizedCv(Base):
    """ATS CV optimization per application (US-C052)."""

    __tablename__ = "optimized_cvs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    application_id: Mapped[int] = mapped_column(
        ForeignKey("applications.id", ondelete="CASCADE"), unique=True, index=True
    )
    match_before: Mapped[float] = mapped_column(Float, default=0.0)
    match_after: Mapped[float] = mapped_column(Float, default=0.0)
    changes_json: Mapped[str] = mapped_column(Text, default="[]")
    optimized_cv_text: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class InterviewPrepSession(Base):
    """Cached interview prep per interview or application (US-C053)."""

    __tablename__ = "interview_prep_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    scheduled_interview_id: Mapped[int | None] = mapped_column(
        ForeignKey("scheduled_interviews.id", ondelete="CASCADE"), nullable=True, index=True
    )
    application_id: Mapped[int | None] = mapped_column(
        ForeignKey("applications.id", ondelete="CASCADE"), nullable=True, index=True
    )
    prep_json: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class SalaryNegotiation(Base):
    """Salary negotiation drafts per application (US-C054)."""

    __tablename__ = "salary_negotiations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    application_id: Mapped[int] = mapped_column(
        ForeignKey("applications.id", ondelete="CASCADE"), index=True
    )
    negotiation_json: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class FollowUpEmail(Base):
    """Post-interview follow-up drafts (US-C055)."""

    __tablename__ = "follow_up_emails"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    scheduled_interview_id: Mapped[int] = mapped_column(
        ForeignKey("scheduled_interviews.id", ondelete="CASCADE"), index=True
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    email_json: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class HiringInsightsCache(Base):
    """Cached hiring-manager mindset per job (US-C056)."""

    __tablename__ = "hiring_insights_cache"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("jobs.id", ondelete="CASCADE"), index=True)
    insights_json: Mapped[str] = mapped_column(Text, nullable=False)
    researched_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class LinkedinOptimization(Base):
    """LinkedIn profile optimization snapshots (US-C057)."""

    __tablename__ = "linkedin_optimizations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(ForeignKey("candidates.id", ondelete="CASCADE"), index=True)
    target_role: Mapped[str] = mapped_column(String(200))
    optimization_json: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AuditEvent(Base):
    """Append-only internal audit ledger — no update/delete; no external side effects."""

    __tablename__ = "audit_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_type: Mapped[str] = mapped_column(String(64), index=True)
    actor_persona: Mapped[str] = mapped_column(String(32), index=True)
    actor_id: Mapped[str] = mapped_column(String(64))
    target_type: Mapped[str] = mapped_column(String(64), index=True)
    target_id: Mapped[str] = mapped_column(String(128), index=True)
    metadata_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    source: Mapped[str] = mapped_column(String(32), default="twin_internal")
    external_side_effect: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)


class WorkItem(Base):
    """Recruiter/company notes and tasks — safe internal persistence."""

    __tablename__ = "work_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    item_type: Mapped[str] = mapped_column(String(32), index=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="open")
    due_date: Mapped[str | None] = mapped_column(String(10), nullable=True)
    owner_label: Mapped[str | None] = mapped_column(String(120), nullable=True)
    persona_scope: Mapped[str] = mapped_column(String(32), index=True)
    company_slug: Mapped[str | None] = mapped_column(String(80), nullable=True, index=True)
    created_by_user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )


class CandidateRoleStatus(Base):
    """Safe non-final pipeline status per candidate-role pair."""

    __tablename__ = "candidate_role_statuses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_ref: Mapped[str] = mapped_column(String(64), index=True)
    role_ref: Mapped[str] = mapped_column(String(64), index=True)
    status: Mapped[str] = mapped_column(String(32))
    company_slug: Mapped[str | None] = mapped_column(String(80), nullable=True)
    updated_by_user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )


class ReviewQueueItem(Base):
    """Internal recruiter review queue — no approve/reject/fulfill."""

    __tablename__ = "review_queue_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    item_kind: Mapped[str] = mapped_column(String(64))
    subject_ref: Mapped[str] = mapped_column(String(128))
    status: Mapped[str] = mapped_column(String(32), default="open")
    priority: Mapped[str | None] = mapped_column(String(16), nullable=True)
    owner_label: Mapped[str | None] = mapped_column(String(120), nullable=True)
    company_slug: Mapped[str | None] = mapped_column(String(80), nullable=True)
    created_by_user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )


class CompanyFeedbackItem(Base):
    """Internal company hiring feedback drafts — no hire/reject outbound."""

    __tablename__ = "company_feedback_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_ref: Mapped[str] = mapped_column(String(64))
    role_ref: Mapped[str] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(32), default="draft")
    rating_preview: Mapped[str | None] = mapped_column(String(16), nullable=True)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    company_slug: Mapped[str | None] = mapped_column(String(80), nullable=True)
    created_by_user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )


class CandidateVisibilityPreference(Base):
    """Internal candidate visibility preferences — no external publication."""

    __tablename__ = "candidate_visibility_preferences"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[str] = mapped_column(String(64), index=True)
    profile_visibility: Mapped[str] = mapped_column(String(32))
    cv_visibility: Mapped[str] = mapped_column(String(32))
    match_visibility: Mapped[str] = mapped_column(String(32))
    company_visibility: Mapped[str] = mapped_column(String(32))
    communication_preference: Mapped[str] = mapped_column(String(32))
    source: Mapped[str] = mapped_column(String(32), default="twin_internal")
    created_by_user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )


class ExportRequest(Base):
    """Read-only export request preview records — no fulfillment."""

    __tablename__ = "export_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    request_type: Mapped[str] = mapped_column(String(64), index=True)
    candidate_id: Mapped[str] = mapped_column(String(64), index=True)
    role_context_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="draft")
    source: Mapped[str] = mapped_column(String(32), default="twin_internal")
    legal_claim: Mapped[bool] = mapped_column(Boolean, default=False)
    created_by_user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class RequestIntakeItem(Base):
    """Internal trust request intake queue — human review only."""

    __tablename__ = "request_intake_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    request_type: Mapped[str] = mapped_column(String(64))
    subject_ref: Mapped[str] = mapped_column(String(128))
    status: Mapped[str] = mapped_column(String(32), default="open")
    candidate_ref: Mapped[str | None] = mapped_column(String(64), nullable=True)
    company_slug: Mapped[str | None] = mapped_column(String(80), nullable=True)
    source: Mapped[str] = mapped_column(String(32), default="twin_internal")
    created_by_user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )


class AgentDispatchRun(Base):
    """Persistent Cursor Cloud Agent dispatch run (TWIN Agent Dispatcher)."""

    __tablename__ = "agent_dispatch_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    status: Mapped[str] = mapped_column(String(32), index=True, default="queued")
    task_name: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    repository_url: Mapped[str] = mapped_column(String(512), index=True)
    base_branch: Mapped[str] = mapped_column(String(255), index=True)
    requested_branch_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    auto_create_pr: Mapped[bool] = mapped_column(Boolean, default=False)
    execution_policy_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    model_id: Mapped[str | None] = mapped_column(String(128), nullable=True)

    prompt_envelope_version: Mapped[str] = mapped_column(String(64))
    prompt_hash: Mapped[str] = mapped_column(String(64), index=True)
    prompt_redacted_preview: Mapped[str | None] = mapped_column(Text, nullable=True)
    prompt_ciphertext: Mapped[str | None] = mapped_column(Text, nullable=True)
    prompt_expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    cursor_api_version: Mapped[str | None] = mapped_column(String(8), nullable=True)
    cursor_agent_id: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    cursor_run_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    cursor_status: Mapped[str | None] = mapped_column(String(64), nullable=True)
    cursor_agent_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    webhook_secret_fingerprint: Mapped[str | None] = mapped_column(String(32), nullable=True)

    result_branch: Mapped[str | None] = mapped_column(String(255), nullable=True)
    result_pr_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    result_head_sha: Mapped[str | None] = mapped_column(String(64), nullable=True)
    result_ci_status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    result_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    github_enrichment_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    expected_artifacts_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    verified_artifacts_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    execution_mode: Mapped[str | None] = mapped_column(String(16), nullable=True, index=True)
    read_only: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    mutation_required: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    operator_execution_required: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    execution_contract_hash: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    operator_correlation_id: Mapped[str | None] = mapped_column(
        String(64), nullable=True, index=True
    )
    operator_requested_at: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True, index=True
    )
    operator_requested_by: Mapped[str | None] = mapped_column(String(32), nullable=True)
    operator_artifacts_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    operator_updated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    error_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    error_message: Mapped[str | None] = mapped_column(String(512), nullable=True)

    idempotency_key: Mapped[str | None] = mapped_column(String(128), unique=True, nullable=True)
    created_by_fingerprint: Mapped[str | None] = mapped_column(String(32), nullable=True)
    metadata_json: Mapped[str | None] = mapped_column(Text, nullable=True)

    lease_expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_polled_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    dispatched_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )


class AgentDispatchLock(Base):
    """Single-active-run lock keyed by repository + base branch."""

    __tablename__ = "agent_dispatch_locks"
    __table_args__ = (UniqueConstraint("repo_url", "base_branch", name="uq_agent_dispatch_lock_repo_branch"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    repo_url: Mapped[str] = mapped_column(String(512), index=True)
    base_branch: Mapped[str] = mapped_column(String(255), index=True)
    run_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("agent_dispatch_runs.id", ondelete="CASCADE"), index=True
    )
    holder_fingerprint: Mapped[str | None] = mapped_column(String(32), nullable=True)
    lease_expires_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )


class AgentDispatchWebhookEvent(Base):
    """Dedupe ledger for Cursor agent webhook deliveries."""

    __tablename__ = "agent_dispatch_webhook_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    delivery_id: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    event_name: Mapped[str] = mapped_column(String(64))
    cursor_agent_id: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    run_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    payload_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    received_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AgentDispatchAuditEvent(Base):
    """Append-only redacted audit trail for dispatcher actions."""

    __tablename__ = "agent_dispatch_audit_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    run_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    event_type: Mapped[str] = mapped_column(String(64), index=True)
    actor_fingerprint: Mapped[str | None] = mapped_column(String(32), nullable=True)
    detail_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AgentDispatchOperatorOperation(Base):
    """Idempotent, restart-safe ledger for one Operator stage."""

    __tablename__ = "agent_dispatch_operator_operations"
    __table_args__ = (
        UniqueConstraint(
            "run_id",
            "operation",
            "idempotency_key",
            name="uq_agent_dispatch_operator_operation",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    run_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("agent_dispatch_runs.id", ondelete="CASCADE"), index=True
    )
    operation: Mapped[str] = mapped_column(String(64), index=True)
    idempotency_key: Mapped[str] = mapped_column(String(128))
    correlation_id: Mapped[str] = mapped_column(String(64), index=True)
    owner_token: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    lease_expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(32), default="started", index=True)
    attempt_count: Mapped[int] = mapped_column(Integer, default=1)
    artifact_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )


class FounderCommand(Base):
    """Founder Command Center durable command (direction → plan → loop)."""

    __tablename__ = "founder_commands"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    status: Mapped[str] = mapped_column(String(32), index=True, default="draft")
    current_stage: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    direction: Mapped[str] = mapped_column(Text)
    autonomy_level: Mapped[int] = mapped_column(Integer, default=3)
    batch_index: Mapped[int] = mapped_column(Integer, default=0)
    max_batches: Mapped[int] = mapped_column(Integer, default=5)
    max_runtime_minutes: Mapped[int] = mapped_column(Integer, default=180)
    max_consecutive_failures: Mapped[int] = mapped_column(Integer, default=2)
    max_retries_per_stage: Mapped[int] = mapped_column(Integer, default=3)
    max_open_prs: Mapped[int] = mapped_column(Integer, default=3)
    max_active_runs: Mapped[int] = mapped_column(Integer, default=1)
    stage_retry_count: Mapped[int] = mapped_column(Integer, default=0)
    consecutive_failures: Mapped[int] = mapped_column(Integer, default=0)
    plan_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    plan_hash: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    project_state_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    links_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    live_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    final_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    dispatch_run_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    idempotency_key: Mapped[str | None] = mapped_column(String(128), unique=True, nullable=True)
    created_by_fingerprint: Mapped[str | None] = mapped_column(String(32), nullable=True)
    error_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    error_message: Mapped[str | None] = mapped_column(String(512), nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )


class FounderCommandTimelineEvent(Base):
    """Append-only timeline for a founder command."""

    __tablename__ = "founder_command_timeline_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    command_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("founder_commands.id", ondelete="CASCADE"), index=True
    )
    stage: Mapped[str] = mapped_column(String(64), index=True)
    message: Mapped[str] = mapped_column(String(512))
    detail_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class FounderDecision(Base):
    """Approval policy decision record."""

    __tablename__ = "founder_decisions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    command_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("founder_commands.id", ondelete="CASCADE"), index=True
    )
    operation: Mapped[str] = mapped_column(String(64), index=True)
    title: Mapped[str] = mapped_column(String(256))
    risk: Mapped[str] = mapped_column(String(32), index=True)
    status: Mapped[str] = mapped_column(String(32), index=True, default="pending")
    evidence_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    actor_fingerprint: Mapped[str | None] = mapped_column(String(32), nullable=True)
    decided_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class FounderCommandNotification(Base):
    """In-app founder notifications (email/Slack/push adapters later)."""

    __tablename__ = "founder_command_notifications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    command_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("founder_commands.id", ondelete="CASCADE"), index=True
    )
    kind: Mapped[str] = mapped_column(String(64), index=True)
    title: Mapped[str] = mapped_column(String(256))
    body: Mapped[str] = mapped_column(Text)
    links_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    channel: Mapped[str] = mapped_column(String(32), default="in_app")
    read_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class FounderCommandAuditEvent(Base):
    """Append-only redacted audit trail for founder commands."""

    __tablename__ = "founder_command_audit_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    command_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    event_type: Mapped[str] = mapped_column(String(64), index=True)
    actor_fingerprint: Mapped[str | None] = mapped_column(String(32), nullable=True)
    detail_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ProductFunnelEvent(Base):
    """Append-only product funnel milestones (non-PII props) for north-star metrics."""

    __tablename__ = "product_funnel_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    persona: Mapped[str] = mapped_column(String(32), default="candidate")
    event_name: Mapped[str] = mapped_column(String(64), index=True)
    signup_week: Mapped[str | None] = mapped_column(String(10), nullable=True, index=True)
    properties_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    occurred_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)


class ActivationMatchingJob(Base):
    """Idempotent activation matching dispatch (one active job per user+profile_version)."""

    __tablename__ = "activation_matching_jobs"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "profile_version",
            name="uq_activation_matching_user_profile_version",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    candidate_id: Mapped[int] = mapped_column(ForeignKey("candidates.id", ondelete="CASCADE"))
    profile_version: Mapped[str] = mapped_column(String(64))
    correlation_id: Mapped[str] = mapped_column(String(36), index=True)
    status: Mapped[str] = mapped_column(String(32), default="pending", index=True)
    failure_category: Mapped[str | None] = mapped_column(String(64), nullable=True)
    match_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    celery_task_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    dispatched_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class ActivationCohort(Base):
    """Pilot activation cohort registry (candidates / recruiters / employers)."""

    __tablename__ = "activation_cohorts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200))
    cohort_type: Mapped[str] = mapped_column(String(32), index=True)  # candidate|recruiter|employer|mixed
    market: Mapped[str] = mapped_column(String(64), default="PL", index=True)
    language: Mapped[str] = mapped_column(String(16), default="pl")
    starts_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    ends_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    target_count: Mapped[int] = mapped_column(Integer, default=50)
    status: Mapped[str] = mapped_column(String(32), default="draft", index=True)
    owner: Mapped[str | None] = mapped_column(String(120), nullable=True)
    source: Mapped[str | None] = mapped_column(String(128), nullable=True)
    campaign: Mapped[str | None] = mapped_column(String(128), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    participants: Mapped[list["ActivationCohortParticipant"]] = relationship(
        back_populates="cohort",
        cascade="all, delete-orphan",
    )


class ActivationCohortParticipant(Base):
    """User membership in an activation cohort — never mix synthetic smoke into NS."""

    __tablename__ = "activation_cohort_participants"
    __table_args__ = (
        UniqueConstraint("cohort_id", "user_id", name="uq_activation_cohort_user"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    cohort_id: Mapped[int] = mapped_column(
        ForeignKey("activation_cohorts.id", ondelete="CASCADE"),
        index=True,
    )
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    role: Mapped[str] = mapped_column(String(32))  # candidate|recruiter|employer
    joined_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    source: Mapped[str | None] = mapped_column(String(128), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="invited", index=True)
    exclude_from_product_metrics: Mapped[bool] = mapped_column(Boolean, default=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    cohort: Mapped["ActivationCohort"] = relationship(back_populates="participants")


class OrganizationTenant(Base):
    """Wave 0 tenancy foundation — company/agency/internal orgs (no marketplace yet)."""

    __tablename__ = "organization_tenants"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    slug: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(200))
    tenant_type: Mapped[str] = mapped_column(String(32), default="company", index=True)
    status: Mapped[str] = mapped_column(String(32), default="active", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class RoleDefinition(Base):
    """System role keys for RBAC foundation (invites still gated)."""

    __tablename__ = "role_definitions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    key: Mapped[str] = mapped_column(String(64), unique=True)
    persona: Mapped[str] = mapped_column(String(32), index=True)
    label: Mapped[str] = mapped_column(String(120))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_system: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class TenantMembership(Base):
    """User membership in a tenant with a role_key — foundation only."""

    __tablename__ = "tenant_memberships"
    __table_args__ = (
        UniqueConstraint("tenant_id", "user_id", "role_key", name="uq_tenant_membership"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tenant_id: Mapped[int] = mapped_column(
        ForeignKey("organization_tenants.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    role_key: Mapped[str] = mapped_column(String(64), index=True)
    status: Mapped[str] = mapped_column(String(32), default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class PermissionGrant(Base):
    """Permission keys granted to role_key — enforce gradually in later waves."""

    __tablename__ = "permission_grants"
    __table_args__ = (
        UniqueConstraint("role_key", "permission_key", name="uq_permission_grant"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    role_key: Mapped[str] = mapped_column(String(64), index=True)
    permission_key: Mapped[str] = mapped_column(String(128))
    effect: Mapped[str] = mapped_column(String(16), default="allow")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class FeatureFlagState(Base):
    """Runtime feature flag overrides (default source of truth remains code/env registry)."""

    __tablename__ = "feature_flag_states"
    __table_args__ = (
        UniqueConstraint("flag_key", "scope", "tenant_id", name="uq_feature_flag_state"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    flag_key: Mapped[str] = mapped_column(String(128), index=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    scope: Mapped[str] = mapped_column(String(32), default="global")
    tenant_id: Mapped[int | None] = mapped_column(
        ForeignKey("organization_tenants.id", ondelete="SET NULL"), nullable=True
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class PlatformDomainEvent(Base):
    """Append-only domain event model (complements audit_events)."""

    __tablename__ = "platform_domain_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_name: Mapped[str] = mapped_column(String(128), index=True)
    aggregate_type: Mapped[str] = mapped_column(String(64))
    aggregate_id: Mapped[str] = mapped_column(String(128))
    actor_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    tenant_id: Mapped[int | None] = mapped_column(
        ForeignKey("organization_tenants.id", ondelete="SET NULL"), nullable=True
    )
    payload_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    source: Mapped[str] = mapped_column(String(32), default="twin_internal")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)


class PrivacyOpsCase(Base):
    """Unified privacy ops case (export / deletion / correction) — foundation queue."""

    __tablename__ = "privacy_ops_cases"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    case_type: Mapped[str] = mapped_column(String(32), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    status: Mapped[str] = mapped_column(String(32), default="open", index=True)
    legal_basis_note: Mapped[str | None] = mapped_column(String(255), nullable=True)
    payload_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    source: Mapped[str] = mapped_column(String(32), default="twin_internal")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class CommunicationOutbox(Base):
    """Shared transactional communication outbox — draft only until workers send."""

    __tablename__ = "communication_outbox"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    channel: Mapped[str] = mapped_column(String(32), default="email")
    template_key: Mapped[str] = mapped_column(String(128), index=True)
    recipient_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    recipient_email_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="draft", index=True)
    payload_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    dedupe_key: Mapped[str | None] = mapped_column(String(128), unique=True, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class HardLiveEvidenceRecord(Base):
    """Machine-readable Hard LIVE 30 evidence per module — Wave 1+."""

    __tablename__ = "hard_live_evidence_records"
    __table_args__ = (UniqueConstraint("module_id", name="uq_hard_live_evidence_module"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    module_id: Mapped[str] = mapped_column(String(128), index=True)
    persona: Mapped[str] = mapped_column(String(32), default="candidate", index=True)
    wave: Mapped[str] = mapped_column(String(16), default="1", index=True)
    status: Mapped[str] = mapped_column(String(32), default="PENDING", index=True)
    criteria_json: Mapped[str] = mapped_column(Text, default="{}")
    blocker: Mapped[str | None] = mapped_column(String(255), nullable=True)
    owner: Mapped[str | None] = mapped_column(String(64), nullable=True)
    smoke_sha: Mapped[str | None] = mapped_column(String(64), nullable=True)
    smoke_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class IntegrationCapabilityRecord(Base):
    """Per-integration capability status — Wave 5 (never collapse whole vendor to LIVE)."""

    __tablename__ = "integration_capability_records"
    __table_args__ = (
        UniqueConstraint(
            "integration_key",
            "capability",
            name="uq_integration_capability_key_cap",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    integration_key: Mapped[str] = mapped_column(String(64), index=True)
    capability: Mapped[str] = mapped_column(String(32))
    status: Mapped[str] = mapped_column(String(32), index=True)
    blocker: Mapped[str | None] = mapped_column(String(128), nullable=True)
    owner: Mapped[str | None] = mapped_column(String(64), nullable=True)
    evidence_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class WebhookDeliveryAttempt(Base):
    """Append-only webhook verify/delivery attempts — Wave 5 observability (no PII payloads)."""

    __tablename__ = "webhook_delivery_attempts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    provider: Mapped[str] = mapped_column(String(64), index=True)
    direction: Mapped[str] = mapped_column(String(16))
    event_type: Mapped[str] = mapped_column(String(128))
    idempotency_key: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    signature_ok: Mapped[bool] = mapped_column(Boolean, default=False)
    replay_rejected: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(32))
    http_status: Mapped[int | None] = mapped_column(Integer, nullable=True)
    attempt_n: Mapped[int] = mapped_column(Integer, default=1)
    error_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    meta_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)


class ConnectorWebhookSubscription(Base):
    """Generic signed outbound webhook subscription (Zapier-compatible, no Marketplace)."""

    __tablename__ = "connector_webhook_subscriptions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    provider: Mapped[str] = mapped_column(String(32), index=True, default="zapier")
    target_url: Mapped[str] = mapped_column(String(512))
    secret_hash: Mapped[str] = mapped_column(String(512))
    secret_prefix: Mapped[str] = mapped_column(String(12))
    event_filter: Mapped[str | None] = mapped_column(String(128), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="active")
    payload_version: Mapped[str] = mapped_column(String(16), default="v1")
    last_delivery_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class GoogleCalendarPushChannel(Base):
    """Google Calendar events.watch channel ownership + renewal metadata."""

    __tablename__ = "google_calendar_push_channels"
    __table_args__ = (UniqueConstraint("channel_id", name="uq_gcal_push_channel_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    channel_id: Mapped[str] = mapped_column(String(128))
    resource_id: Mapped[str | None] = mapped_column(String(256), nullable=True)
    calendar_id: Mapped[str] = mapped_column(String(256), default="primary")
    expiration_ms: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    channel_token_hash: Mapped[str | None] = mapped_column(String(128), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="active")
    last_notification_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class ConnectorTestReceiverEvent(Base):
    """Internal signed webhook test receiver — Zapier smoke without public catch services."""

    __tablename__ = "connector_test_receiver_events"
    __table_args__ = (
        UniqueConstraint("event_id", name="uq_connector_test_receiver_event_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    subscription_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    event_id: Mapped[str] = mapped_column(String(128))
    provider: Mapped[str] = mapped_column(String(32))
    signature_ok: Mapped[bool] = mapped_column(Boolean, default=False)
    replay_rejected: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(32))
    meta_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)


class CompanyOrgSettings(Base):
    """Company org settings — Wave 3 Hard LIVE persistence (tenant-scoped)."""

    __tablename__ = "company_org_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    company_slug: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(200))
    timezone: Mapped[str] = mapped_column(String(64), default="Europe/Warsaw")
    locale: Mapped[str] = mapped_column(String(16), default="pl")
    hiring_policy_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_by_role: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class CompanyScorecardEntry(Base):
    """Company hiring scorecard / decision — never demo fixtures as production truth."""

    __tablename__ = "company_scorecard_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    company_slug: Mapped[str] = mapped_column(String(80), index=True)
    subject_type: Mapped[str] = mapped_column(String(32))
    subject_id: Mapped[str] = mapped_column(String(64))
    role_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    decision_code: Mapped[str] = mapped_column(String(64))
    rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    summary: Mapped[str] = mapped_column(String(500))
    source: Mapped[str] = mapped_column(String(32), default="live")
    demo_fixture: Mapped[bool] = mapped_column(Boolean, default=False)
    meta_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )



class CareerClaim(Base):
    """Career Evidence Graph claim — never collapse to a single verified boolean."""

    __tablename__ = "career_claims"
    __table_args__ = (UniqueConstraint("claim_id", name="uq_career_claims_claim_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    claim_id: Mapped[str] = mapped_column(String(64), index=True)
    tenant_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    subject_type: Mapped[str] = mapped_column(String(64))
    subject_id: Mapped[str] = mapped_column(String(128))
    claim_type: Mapped[str] = mapped_column(String(64))
    claim_key: Mapped[str] = mapped_column(String(128))
    claim_value: Mapped[str] = mapped_column(Text)
    normalized_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    value_schema_version: Mapped[str] = mapped_column(String(32), default="1")
    status: Mapped[str] = mapped_column(String(32), index=True)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    confidence_method: Mapped[str | None] = mapped_column(String(64), nullable=True)
    source_type: Mapped[str] = mapped_column(String(64))
    source_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    source_uri_or_reference: Mapped[str | None] = mapped_column(String(500), nullable=True)
    source_hash: Mapped[str | None] = mapped_column(String(128), nullable=True)
    created_by_actor_type: Mapped[str] = mapped_column(String(32))
    created_by_actor_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    valid_from: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    valid_until: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    verified_by: Mapped[str | None] = mapped_column(String(128), nullable=True)
    disputed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    disputed_by: Mapped[str | None] = mapped_column(String(128), nullable=True)
    expired_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    superseded_by_claim_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    model_run_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    prompt_version_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    evidence_count: Mapped[int] = mapped_column(Integer, default=0)
    human_confirmation_required: Mapped[bool] = mapped_column(Boolean, default=False)
    human_confirmation_status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    visibility_scope: Mapped[str] = mapped_column(String(64), default="subject")
    retention_policy: Mapped[str] = mapped_column(String(64), default="standard")
    legal_basis_reference: Mapped[str | None] = mapped_column(String(128), nullable=True)
    audit_correlation_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    owner_user_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class CareerEvidenceObject(Base):
    """Evidence object — has own verification status; never auto-truth."""

    __tablename__ = "career_evidence_objects"
    __table_args__ = (UniqueConstraint("evidence_id", name="uq_career_evidence_evidence_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    evidence_id: Mapped[str] = mapped_column(String(64), index=True)
    tenant_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    evidence_type: Mapped[str] = mapped_column(String(64), index=True)
    source_type: Mapped[str] = mapped_column(String(64))
    source_reference: Mapped[str | None] = mapped_column(String(500), nullable=True)
    source_hash: Mapped[str | None] = mapped_column(String(128), nullable=True)
    issuer: Mapped[str | None] = mapped_column(String(128), nullable=True)
    issued_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    received_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    verification_method: Mapped[str | None] = mapped_column(String(64), nullable=True)
    verification_status: Mapped[str] = mapped_column(String(32), default="unverified")
    verification_actor: Mapped[str | None] = mapped_column(String(128), nullable=True)
    verification_timestamp: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    document_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    structured_payload: Mapped[str | None] = mapped_column(Text, nullable=True)
    redacted_payload: Mapped[str | None] = mapped_column(Text, nullable=True)
    sensitivity: Mapped[str] = mapped_column(String(32), default="standard")
    visibility_scope: Mapped[str] = mapped_column(String(64), default="subject")
    retention_policy: Mapped[str] = mapped_column(String(64), default="standard")
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    revocation_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    superseded_by: Mapped[str | None] = mapped_column(String(64), nullable=True)
    audit_correlation_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    owner_user_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class ClaimEvidenceLink(Base):
    """Explicit many-to-many link between claims and evidence."""

    __tablename__ = "claim_evidence_links"
    __table_args__ = (
        UniqueConstraint("claim_id", "evidence_id", name="uq_claim_evidence_link"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    claim_id: Mapped[str] = mapped_column(String(64), index=True)
    evidence_id: Mapped[str] = mapped_column(String(64), index=True)
    link_role: Mapped[str] = mapped_column(String(64), default="supports")
    explicit_multi_link: Mapped[bool] = mapped_column(Boolean, default=False)
    created_by_actor_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ClaimStatusHistory(Base):
    """Append-only claim status transitions — immutable audit."""

    __tablename__ = "claim_status_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    claim_id: Mapped[str] = mapped_column(String(64), index=True)
    from_status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    to_status: Mapped[str] = mapped_column(String(32))
    actor_type: Mapped[str] = mapped_column(String(32))
    actor_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    reason_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
    audit_correlation_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)


class ClaimDispute(Base):
    """Claim dispute / correction / appeal workflow."""

    __tablename__ = "claim_disputes"
    __table_args__ = (UniqueConstraint("dispute_id", name="uq_claim_disputes_dispute_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    dispute_id: Mapped[str] = mapped_column(String(64), index=True)
    claim_id: Mapped[str] = mapped_column(String(64), index=True)
    raised_by: Mapped[str] = mapped_column(String(128))
    reason_code: Mapped[str] = mapped_column(String(64))
    free_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    evidence_ids_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="OPEN", index=True)
    assigned_to: Mapped[str | None] = mapped_column(String(128), nullable=True)
    resolution: Mapped[str | None] = mapped_column(String(64), nullable=True)
    resolution_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    resolved_by: Mapped[str | None] = mapped_column(String(128), nullable=True)
    appeal_status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    appeal_deadline: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    audit_correlation_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    tenant_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class AiSystemRegistry(Base):
    """Central AI system / model registry — readiness language, not legal certification."""

    __tablename__ = "ai_system_registry"
    __table_args__ = (UniqueConstraint("ai_system_id", name="uq_ai_system_registry_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ai_system_id: Mapped[str] = mapped_column(String(64), index=True)
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    use_case: Mapped[str] = mapped_column(String(128))
    provider: Mapped[str] = mapped_column(String(64))
    model_name: Mapped[str] = mapped_column(String(128))
    model_version: Mapped[str] = mapped_column(String(64))
    deployment_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    environment: Mapped[str] = mapped_column(String(32), default="production")
    owner: Mapped[str] = mapped_column(String(64))
    business_owner: Mapped[str | None] = mapped_column(String(64), nullable=True)
    technical_owner: Mapped[str | None] = mapped_column(String(64), nullable=True)
    risk_owner: Mapped[str | None] = mapped_column(String(64), nullable=True)
    status: Mapped[str] = mapped_column(String(32), index=True)
    risk_classification: Mapped[str] = mapped_column(String(64), index=True)
    high_risk_candidate: Mapped[bool] = mapped_column(Boolean, default=False)
    decision_impact: Mapped[str] = mapped_column(String(64))
    human_oversight_required: Mapped[bool] = mapped_column(Boolean, default=True)
    allowed_personas_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    allowed_tenants_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    input_data_categories_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    output_data_categories_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    protected_attribute_policy: Mapped[str] = mapped_column(String(64), default="never_infer")
    training_data_disclosure: Mapped[str | None] = mapped_column(Text, nullable=True)
    fine_tuning_status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    prompt_template_ids_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    evaluation_suite: Mapped[str | None] = mapped_column(String(128), nullable=True)
    baseline_metrics_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    known_limitations: Mapped[str | None] = mapped_column(Text, nullable=True)
    prohibited_uses_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    rollout_strategy: Mapped[str | None] = mapped_column(Text, nullable=True)
    rollback_strategy: Mapped[str | None] = mapped_column(Text, nullable=True)
    monitoring_plan: Mapped[str | None] = mapped_column(Text, nullable=True)
    retention_policy: Mapped[str] = mapped_column(String(64), default="ai_logs_90d")
    introduced_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_reviewed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    retired_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class AiPromptTemplate(Base):
    """Versioned prompt registry — hashes only, no secrets/PII."""

    __tablename__ = "ai_prompt_templates"
    __table_args__ = (
        UniqueConstraint("prompt_template_id", "version", name="uq_ai_prompt_template_ver"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    prompt_template_id: Mapped[str] = mapped_column(String(64), index=True)
    use_case: Mapped[str] = mapped_column(String(128), index=True)
    version: Mapped[str] = mapped_column(String(32))
    status: Mapped[str] = mapped_column(String(32), index=True)
    owner: Mapped[str] = mapped_column(String(64))
    system_prompt_hash: Mapped[str] = mapped_column(String(128))
    user_prompt_schema: Mapped[str | None] = mapped_column(Text, nullable=True)
    variables_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    expected_output_schema: Mapped[str | None] = mapped_column(Text, nullable=True)
    safety_instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    prohibited_behavior: Mapped[str | None] = mapped_column(Text, nullable=True)
    human_review_requirement: Mapped[bool] = mapped_column(Boolean, default=True)
    test_suite: Mapped[str | None] = mapped_column(String(128), nullable=True)
    evaluation_result: Mapped[str | None] = mapped_column(Text, nullable=True)
    introduced_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    deprecated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    superseded_by: Mapped[str | None] = mapped_column(String(64), nullable=True)
    rollback_version: Mapped[str | None] = mapped_column(String(32), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AiDecisionRun(Base):
    """AI Decision Log — redacted payloads only."""

    __tablename__ = "ai_decision_runs"
    __table_args__ = (UniqueConstraint("ai_run_id", name="uq_ai_decision_runs_run_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ai_run_id: Mapped[str] = mapped_column(String(64), index=True)
    tenant_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    ai_system_id: Mapped[str] = mapped_column(String(64), index=True)
    model_version: Mapped[str] = mapped_column(String(64))
    deployment_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    prompt_template_id: Mapped[str] = mapped_column(String(64))
    prompt_version: Mapped[str] = mapped_column(String(32))
    input_reference: Mapped[str | None] = mapped_column(String(255), nullable=True)
    input_hash: Mapped[str | None] = mapped_column(String(128), nullable=True)
    input_data_categories_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    output_reference: Mapped[str | None] = mapped_column(String(255), nullable=True)
    output_hash: Mapped[str | None] = mapped_column(String(128), nullable=True)
    output_type: Mapped[str] = mapped_column(String(64))
    redacted_input_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    redacted_output_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    confidence_method: Mapped[str | None] = mapped_column(String(64), nullable=True)
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    token_usage: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cost_estimate: Mapped[float | None] = mapped_column(Float, nullable=True)
    fallback_used: Mapped[bool] = mapped_column(Boolean, default=False)
    safety_filter_triggered: Mapped[bool] = mapped_column(Boolean, default=False)
    protected_attribute_used: Mapped[bool] = mapped_column(Boolean, default=False)
    human_review_required: Mapped[bool] = mapped_column(Boolean, default=True)
    human_review_status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    human_reviewer: Mapped[str | None] = mapped_column(String(128), nullable=True)
    human_override: Mapped[bool] = mapped_column(Boolean, default=False)
    override_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    accepted: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    rejected: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    escalated: Mapped[bool] = mapped_column(Boolean, default=False)
    created_claim_ids_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    affected_subject_ids_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    decision_impact: Mapped[str | None] = mapped_column(String(64), nullable=True)
    explanation_reference: Mapped[str | None] = mapped_column(String(64), nullable=True)
    retention_policy: Mapped[str] = mapped_column(String(64), default="ai_logs_90d")
    audit_correlation_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    owner_user_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)


class AiExplanation(Base):
    """Explainability record tied to an AI run — PARTIAL when incomplete."""

    __tablename__ = "ai_explanations"
    __table_args__ = (UniqueConstraint("explanation_id", name="uq_ai_explanations_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    explanation_id: Mapped[str] = mapped_column(String(64), index=True)
    ai_run_id: Mapped[str] = mapped_column(String(64), index=True)
    why: Mapped[str] = mapped_column(Text)
    based_on_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    data_used_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    data_not_used_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    key_factors_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    counterfactors_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    limitations: Mapped[str | None] = mapped_column(Text, nullable=True)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    uncertainty: Mapped[str | None] = mapped_column(Text, nullable=True)
    human_action_required: Mapped[bool] = mapped_column(Boolean, default=True)
    prohibited_interpretation: Mapped[str | None] = mapped_column(Text, nullable=True)
    model_and_prompt_version: Mapped[str | None] = mapped_column(String(128), nullable=True)
    completeness: Mapped[str] = mapped_column(String(32), default="PARTIAL")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AiHumanReview(Base):
    """Human review / override of AI outputs — binding employment decisions require this."""

    __tablename__ = "ai_human_reviews"
    __table_args__ = (UniqueConstraint("review_id", name="uq_ai_human_reviews_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    review_id: Mapped[str] = mapped_column(String(64), index=True)
    ai_run_id: Mapped[str] = mapped_column(String(64), index=True)
    claim_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="PENDING", index=True)
    actor: Mapped[str | None] = mapped_column(String(128), nullable=True)
    actor_role: Mapped[str | None] = mapped_column(String(64), nullable=True)
    original_output_ref: Mapped[str | None] = mapped_column(String(255), nullable=True)
    final_outcome: Mapped[str | None] = mapped_column(String(64), nullable=True)
    reason_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    justification: Mapped[str | None] = mapped_column(Text, nullable=True)
    supporting_evidence_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    audit_correlation_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class AiProhibitedUse(Base):
    """Machine-readable prohibited-use registry — block + audit + no provider call."""

    __tablename__ = "ai_prohibited_uses"
    __table_args__ = (UniqueConstraint("use_key", name="uq_ai_prohibited_use_key"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    use_key: Mapped[str] = mapped_column(String(128), index=True)
    description: Mapped[str] = mapped_column(Text)
    severity: Mapped[str] = mapped_column(String(32), default="PROHIBITED")
    block_provider_call: Mapped[bool] = mapped_column(Boolean, default=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AiInAppNotification(Base):
    """In-app only notifications for disputes/reviews — smoke never sends email."""

    __tablename__ = "ai_in_app_notifications"
    __table_args__ = (UniqueConstraint("notification_id", name="uq_ai_in_app_notifications_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    notification_id: Mapped[str] = mapped_column(String(64), index=True)
    user_id: Mapped[int] = mapped_column(Integer, index=True)
    kind: Mapped[str] = mapped_column(String(64))
    payload_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    read_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AtsSyncAttempt(Base):
    """Outbound/inbound ATS sync attempt ledger — dry-run by default."""

    __tablename__ = "ats_sync_attempts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    company_slug: Mapped[str] = mapped_column(String(80), index=True)
    provider: Mapped[str] = mapped_column(String(32), index=True)
    direction: Mapped[str] = mapped_column(String(16), default="write")
    external_id: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    dry_run: Mapped[bool] = mapped_column(Boolean, default=True)
    status: Mapped[str] = mapped_column(String(32), default="queued")
    payload_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class CompanyCalendarConnection(Base):
    """Employer-scoped calendar connection (MS/Google) — draft-first writes."""

    __tablename__ = "company_calendar_connections"
    __table_args__ = (UniqueConstraint("company_slug", "provider", name="uq_company_calendar_slug_provider"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    company_slug: Mapped[str] = mapped_column(String(80), index=True)
    provider: Mapped[str] = mapped_column(String(32))
    status: Mapped[str] = mapped_column(String(32), default="disconnected")
    token_encrypted: Mapped[str | None] = mapped_column(Text, nullable=True)
    scopes: Mapped[str | None] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class CompanyBillingAccount(Base):
    """B2B Stripe sandbox account — checkout_enabled only with controls."""

    __tablename__ = "company_billing_accounts"
    __table_args__ = (UniqueConstraint("company_slug", name="uq_company_billing_slug"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    company_slug: Mapped[str] = mapped_column(String(80), index=True)
    stripe_customer_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    plan_sku: Mapped[str | None] = mapped_column(String(64), nullable=True)
    checkout_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class CareerClaimExternalVerification(Base):
    """External claim verification provider results — no auto-employment."""

    __tablename__ = "career_claim_external_verifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    claim_id: Mapped[int] = mapped_column(Integer, index=True)
    provider: Mapped[str] = mapped_column(String(64))
    request_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    result_status: Mapped[str] = mapped_column(String(32), default="pending")
    result_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CompanyCalendarHold(Base):
    """Draft interview holds for company scheduling — provider write gated."""

    __tablename__ = "company_calendar_holds"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    company_slug: Mapped[str] = mapped_column(String(80), index=True)
    title: Mapped[str] = mapped_column(String(200))
    starts_at: Mapped[datetime] = mapped_column(DateTime)
    ends_at: Mapped[datetime] = mapped_column(DateTime)
    provider: Mapped[str] = mapped_column(String(32), default="local")
    status: Mapped[str] = mapped_column(String(32), default="draft")
    provider_event_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class PilotOrganization(Base):
    """Controlled-pilot employer/org candidate — FOUNDER_APPROVED required before invites."""

    __tablename__ = "pilot_organizations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    slug: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(200))
    market: Mapped[str] = mapped_column(String(64), default="PL", index=True)
    approval_status: Mapped[str] = mapped_column(
        String(32), default="CANDIDATE", index=True
    )  # CANDIDATE|FOUNDER_APPROVED|REJECTED|WITHDRAWN
    is_synthetic: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    recipient_emails_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    cohort_id: Mapped[int | None] = mapped_column(
        ForeignKey("activation_cohorts.id", ondelete="SET NULL"), nullable=True, index=True
    )
    tenant_id: Mapped[int | None] = mapped_column(
        ForeignKey("organization_tenants.id", ondelete="SET NULL"), nullable=True, index=True
    )
    approved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    approved_by_label: Mapped[str | None] = mapped_column(String(120), nullable=True)
    legal_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    sponsor_label: Mapped[str | None] = mapped_column(String(120), nullable=True)
    founder_org_approval_ref: Mapped[str | None] = mapped_column(String(128), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class PilotInvitationPack(Base):
    """Invitation pack for a pilot org — DRAFT/READY_UNSENT until Founder send approval."""

    __tablename__ = "pilot_invitation_packs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    organization_id: Mapped[int] = mapped_column(
        ForeignKey("pilot_organizations.id", ondelete="CASCADE"), index=True
    )
    status: Mapped[str] = mapped_column(
        String(32), default="DRAFT", index=True
    )  # DRAFT|READY_UNSENT|SENT|REVOKED
    recipients_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    template_key: Mapped[str] = mapped_column(String(128), default="controlled_pilot_invite_v1")
    prepared_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    founder_send_approval_ref: Mapped[str | None] = mapped_column(String(128), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class PilotSupportTicket(Base):
    """Lightweight pilot support queue — no PII in logs; escalate to on-call."""

    __tablename__ = "pilot_support_tickets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    organization_id: Mapped[int | None] = mapped_column(
        ForeignKey("pilot_organizations.id", ondelete="SET NULL"), nullable=True, index=True
    )
    category: Mapped[str] = mapped_column(String(64), default="general", index=True)
    status: Mapped[str] = mapped_column(String(32), default="open", index=True)
    subject: Mapped[str] = mapped_column(String(200))
    body_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    severity: Mapped[str] = mapped_column(String(16), default="normal")
    assigned_to_label: Mapped[str | None] = mapped_column(String(120), nullable=True)
    sla_hours: Mapped[int] = mapped_column(Integer, default=24)
    sla_due_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    resolution_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    audit_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class PilotAiValidationPlan(Base):
    """Per-org AI validation plan — created only for FOUNDER_APPROVED non-synthetic orgs."""

    __tablename__ = "pilot_ai_validation_plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    organization_id: Mapped[int] = mapped_column(
        ForeignKey("pilot_organizations.id", ondelete="CASCADE"), unique=True, index=True
    )
    status: Mapped[str] = mapped_column(String(32), default="DRAFT", index=True)
    plan_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class PilotAiValidationEvent(Base):
    """Non-PII real-user AI validation events — synthetic flagged separately from KPI."""

    __tablename__ = "pilot_ai_validation_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    organization_id: Mapped[int | None] = mapped_column(
        ForeignKey("pilot_organizations.id", ondelete="SET NULL"), nullable=True, index=True
    )
    tenant_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    event_name: Mapped[str] = mapped_column(String(64), index=True)
    persona: Mapped[str] = mapped_column(String(32), default="recruiter")
    workflow_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    is_synthetic: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    metadata_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class CandidateIntelligenceProfile(Base):
    """Structured AI-assisted CV profile — never an autonomous employment decision."""

    __tablename__ = "candidate_intelligence_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(
        ForeignKey("candidates.id", ondelete="CASCADE"), unique=True, index=True
    )
    tenant_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    source_document_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    source_version: Mapped[str | None] = mapped_column(String(64), nullable=True)
    extraction_status: Mapped[str] = mapped_column(String(32), default="pending", index=True)
    extraction_model: Mapped[str | None] = mapped_column(String(64), nullable=True)
    extraction_version: Mapped[str] = mapped_column(String(32), default="v1")
    extraction_started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    extraction_completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    current_role: Mapped[str | None] = mapped_column(String(200), nullable=True)
    current_employer: Mapped[str | None] = mapped_column(String(200), nullable=True)
    seniority: Mapped[str | None] = mapped_column(String(32), nullable=True)
    total_experience_months: Mapped[int | None] = mapped_column(Integer, nullable=True)
    relevant_experience_months: Mapped[int | None] = mapped_column(Integer, nullable=True)
    primary_domains_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    normalized_skills_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    education_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    language_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    location_summary: Mapped[str | None] = mapped_column(String(200), nullable=True)
    availability_summary: Mapped[str | None] = mapped_column(String(200), nullable=True)
    profile_confidence: Mapped[str | None] = mapped_column(String(16), nullable=True)
    warnings_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    human_corrections_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    cost_tokens_estimate: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class CandidateEmploymentTimelineEntry(Base):
    __tablename__ = "candidate_employment_timeline_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    profile_id: Mapped[int] = mapped_column(
        ForeignKey("candidate_intelligence_profiles.id", ondelete="CASCADE"), index=True
    )
    employer: Mapped[str | None] = mapped_column(String(200), nullable=True)
    title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    normalized_title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    start_date: Mapped[str | None] = mapped_column(String(32), nullable=True)
    end_date: Mapped[str | None] = mapped_column(String(32), nullable=True)
    date_precision: Mapped[str | None] = mapped_column(String(16), nullable=True)
    duration_months: Mapped[int | None] = mapped_column(Integer, nullable=True)
    employment_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    responsibilities_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    achievements_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    technologies_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    domains_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    leadership_scope: Mapped[str | None] = mapped_column(String(200), nullable=True)
    evidence_reference: Mapped[str | None] = mapped_column(Text, nullable=True)
    confidence: Mapped[str | None] = mapped_column(String(16), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CandidateIntelligenceSignal(Base):
    __tablename__ = "candidate_intelligence_signals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    profile_id: Mapped[int] = mapped_column(
        ForeignKey("candidate_intelligence_profiles.id", ondelete="CASCADE"), index=True
    )
    signal_type: Mapped[str] = mapped_column(String(64), index=True)
    category: Mapped[str] = mapped_column(String(64), default="career")
    explanation: Mapped[str] = mapped_column(Text)
    evidence_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    confidence: Mapped[str | None] = mapped_column(String(16), nullable=True)
    role_specific: Mapped[bool] = mapped_column(Boolean, default=False)
    human_review_required: Mapped[bool] = mapped_column(Boolean, default=False)
    dismissed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CandidateRoleMatch(Base):
    """Explainable role fit — MATCH|NO_MATCH|UNKNOWN; human review required."""

    __tablename__ = "candidate_role_matches"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(
        ForeignKey("candidates.id", ondelete="CASCADE"), index=True
    )
    role_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    job_id: Mapped[int | None] = mapped_column(
        ForeignKey("jobs.id", ondelete="SET NULL"), nullable=True, index=True
    )
    tenant_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    overall_fit_band: Mapped[str] = mapped_column(String(16), index=True)  # MATCH|NO_MATCH|UNKNOWN
    numeric_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    score_version: Mapped[str] = mapped_column(String(32), default="intel_v1")
    dimensions_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    strengths_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    gaps_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    unknowns_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    evidence_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    confidence: Mapped[str | None] = mapped_column(String(16), nullable=True)
    generated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    stale_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    recruiter_override: Mapped[str | None] = mapped_column(String(16), nullable=True)
    recruiter_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    override_audit_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    human_review_required: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class CandidateMissingInformation(Base):
    __tablename__ = "candidate_missing_information"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    profile_id: Mapped[int] = mapped_column(
        ForeignKey("candidate_intelligence_profiles.id", ondelete="CASCADE"), index=True
    )
    role_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    field: Mapped[str] = mapped_column(String(128))
    status: Mapped[str] = mapped_column(String(32), default="open", index=True)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    importance: Mapped[str | None] = mapped_column(String(16), nullable=True)
    source_evidence: Mapped[str | None] = mapped_column(Text, nullable=True)
    recruiter_resolution: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CandidateRecruiterBrief(Base):
    __tablename__ = "candidate_recruiter_briefs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(
        ForeignKey("candidates.id", ondelete="CASCADE"), index=True
    )
    profile_id: Mapped[int] = mapped_column(
        ForeignKey("candidate_intelligence_profiles.id", ondelete="CASCADE"), index=True
    )
    role_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    brief: Mapped[str] = mapped_column(Text)
    factual_points_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    inferred_points_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    warnings_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    evidence_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    model_version: Mapped[str | None] = mapped_column(String(64), nullable=True)
    generated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CandidatePilotCohort(Base):
    """Candidate-first controlled pilot cohort — no employer/tenant required."""

    __tablename__ = "candidate_pilot_cohorts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    slug: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(200))
    status: Mapped[str] = mapped_column(String(32), default="DRAFT", index=True)
    # DRAFT|FOUNDER_APPROVED|ACTIVE|PAUSED|CLOSED
    is_synthetic: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    founder_cohort_approval_ref: Mapped[str | None] = mapped_column(String(128), nullable=True)
    approved_by_label: Mapped[str | None] = mapped_column(String(120), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    success_criteria_ref: Mapped[str | None] = mapped_column(String(200), nullable=True)
    data_processing_basis_ref: Mapped[str | None] = mapped_column(String(128), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class CandidatePilotInvitationPack(Base):
    """Candidate invite pack — READY_UNSENT until separate Founder send auth."""

    __tablename__ = "candidate_pilot_invitation_packs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    cohort_id: Mapped[int] = mapped_column(
        ForeignKey("candidate_pilot_cohorts.id", ondelete="CASCADE"), index=True
    )
    status: Mapped[str] = mapped_column(String(32), default="DRAFT", index=True)
    recipients_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    template_key: Mapped[str] = mapped_column(String(128), default="candidate_first_invite_v1")
    pack_content_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    prepared_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    founder_send_approval_ref: Mapped[str | None] = mapped_column(String(128), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class CandidatePilotIntakeRow(Base):
    """Named candidate recipient intake — email hashed/masked; never invent."""

    __tablename__ = "candidate_pilot_intake_rows"
    __table_args__ = (
        UniqueConstraint("cohort_id", "email_hash", name="uq_candidate_pilot_intake_email"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    cohort_id: Mapped[int] = mapped_column(
        ForeignKey("candidate_pilot_cohorts.id", ondelete="CASCADE"), index=True
    )
    email_masked: Mapped[str] = mapped_column(String(200))
    email_hash: Mapped[str] = mapped_column(String(64))
    # Fernet ciphertext for Founder-authorized send only — never log plaintext.
    email_ciphertext: Mapped[str | None] = mapped_column(Text, nullable=True)
    locale: Mapped[str] = mapped_column(String(8), default="pl")
    consent_basis_ref: Mapped[str | None] = mapped_column(String(128), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="INTAKE", index=True)
    is_synthetic: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CandidateInviteToken(Base):
    """Cryptographic invite token — expiry, revoke, single-use, rate-limited validate."""

    __tablename__ = "candidate_invite_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    cohort_id: Mapped[int] = mapped_column(
        ForeignKey("candidate_pilot_cohorts.id", ondelete="CASCADE"), index=True
    )
    pack_id: Mapped[int | None] = mapped_column(
        ForeignKey("candidate_pilot_invitation_packs.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    intake_row_id: Mapped[int | None] = mapped_column(
        ForeignKey("candidate_pilot_intake_rows.id", ondelete="SET NULL"),
        nullable=True,
    )
    email_hash: Mapped[str] = mapped_column(String(64), index=True)
    email_masked: Mapped[str] = mapped_column(String(200))
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    status: Mapped[str] = mapped_column(String(32), default="ACTIVE", index=True)
    # ACTIVE|USED|REVOKED|EXPIRED
    expires_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    used_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_validate_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    validate_fail_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CandidatePilotAllowlist(Base):
    """Hash-only registration allowlist synced on Founder-authorized send."""

    __tablename__ = "candidate_pilot_allowlist"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    email_masked: Mapped[str] = mapped_column(String(200))
    cohort_id: Mapped[int | None] = mapped_column(
        ForeignKey("candidate_pilot_cohorts.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    pack_id: Mapped[int | None] = mapped_column(
        ForeignKey("candidate_pilot_invitation_packs.id", ondelete="SET NULL"),
        nullable=True,
    )
    source: Mapped[str] = mapped_column(String(64), default="founder_send")
    active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
