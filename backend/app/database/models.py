"""SQLAlchemy ORM models."""

from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
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
    auto_apply_consent: Mapped["AutoApplyConsent | None"] = relationship(
        back_populates="candidate",
        uselist=False,
    )
    saved_jobs: Mapped[list["SavedJob"]] = relationship(
        back_populates="candidate",
        cascade="all, delete-orphan",
    )


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
    url: Mapped[str] = mapped_column(String(500))
    is_validated: Mapped[bool] = mapped_column(Boolean, default=False)
    scraped_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

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


class Application(Base):
    __tablename__ = "applications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    candidate_id: Mapped[int] = mapped_column(ForeignKey("candidates.id"), index=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("jobs.id"), index=True)
    status: Mapped[ApplicationStatus] = mapped_column(
        Enum(ApplicationStatus), default=ApplicationStatus.PENDING
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


class PlacementEvent(Base):
    """Append-only audit trail for placement verification (no raw tokens)."""

    __tablename__ = "placement_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    application_id: Mapped[int] = mapped_column(
        ForeignKey("applications.id", ondelete="CASCADE"),
        index=True,
    )
    event_type: Mapped[str] = mapped_column(String(64))
    actor: Mapped[str] = mapped_column(String(32))
    detail_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    application: Mapped["Application"] = relationship(back_populates="placement_events")


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

