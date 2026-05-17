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

    candidate: Mapped["Candidate | None"] = relationship(back_populates="user")
    password_reset_tokens: Mapped[list["PasswordResetToken"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    oauth_accounts: Mapped[list["OAuthAccount"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    identity_verifications: Mapped[list["IdentityVerification"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


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

    candidate: Mapped["Candidate"] = relationship(back_populates="applications")
    job: Mapped["Job"] = relationship(back_populates="applications")
