"""Synthetic authenticated Daily Career OS session mint (ops-only, KPI-excluded).

Never creates real candidates. Tokens are short-lived for product proof only.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.database.models import Candidate, CandidateCareerCompass, User
from app.services import candidate_auth_session as cas

SYNTH_EMAIL = "daily-os-synth+kpi@twin.internal"
SYNTH_NAME = "Daily OS Synthetic Proof"


def ensure_synthetic_daily_os_candidate(db: Session) -> tuple[User, Candidate]:
    """Idempotent synthetic user+candidate marked exclude_from_product_metrics."""
    user = db.query(User).filter(User.email == SYNTH_EMAIL).one_or_none()
    if not user:
        user = User(
            email=SYNTH_EMAIL,
            hashed_password=hash_password("synth-not-for-login-use-jwt"),
            gdpr_consent_at=datetime.now(timezone.utc),
            exclude_from_product_metrics=True,
        )
        db.add(user)
        db.flush()
    else:
        user.exclude_from_product_metrics = True
    cand = db.query(Candidate).filter(Candidate.user_id == user.id).one_or_none()
    if not cand:
        cand = Candidate(
            user_id=user.id,
            name=SYNTH_NAME,
            skills='["Python","SQL"]',
            experience_years=5,
            cv_text="Synthetic Daily OS proof candidate — not a real person.",
        )
        db.add(cand)
        db.flush()
    compass = (
        db.query(CandidateCareerCompass)
        .filter(CandidateCareerCompass.candidate_id == cand.id)
        .one_or_none()
    )
    if not compass:
        db.add(
            CandidateCareerCompass(
                candidate_id=cand.id,
                target_role="Senior Backend Engineer",
                target_seniority="senior",
                work_mode="remote",
                skill_gaps='["Kubernetes"]',
                strengths='["Python"]',
                next_steps='["Ship Daily OS proof"]',
                learning_actions='["System design"]',
                completion_status="partial",
            )
        )
    db.commit()
    db.refresh(user)
    db.refresh(cand)
    return user, cand


def mint_synthetic_daily_os_session(db: Session, *, expires_minutes: int = 45) -> dict:
    """Return short-lived JWT for synthetic candidate Daily OS E2E."""
    user, cand = ensure_synthetic_daily_os_candidate(db)
    # Prior epic E2E may have paused lifecycle privacy on the shared synth user —
    # reset so product-proof sessions can create approvals without Founder action.
    try:
        from app.services import career_lifecycle as life

        privacy = life.get_or_create_privacy(db, candidate_id=cand.id)
        if privacy.paused or not privacy.orchestration_opt_in or not privacy.search_opt_in:
            life.update_privacy(
                db,
                candidate_id=cand.id,
                paused=False,
                orchestration_opt_in=True,
                search_opt_in=True,
                learning_opt_in=True,
                reminders_opt_in=True,
            )
        life.get_or_create_context(db, candidate_id=cand.id, is_synthetic=True)
    except Exception:
        pass

    issued = cas.issue_session(
        db,
        user=user,
        expires_minutes=expires_minutes,
        kpi_excluded=True,
        label="synthetic",
    )
    return {
        "ok": True,
        "email": user.email,
        "candidate_id": cand.id,
        "user_id": user.id,
        "access_token": issued["access_token"],
        "refresh_token": issued.get("refresh_token"),
        "session_key": issued.get("session_key"),
        "managed": bool(issued.get("managed")),
        "expires_minutes": expires_minutes,
        "kpi_excluded": True,
        "synthetic": True,
        "real_person": False,
        "label": "synthetic_auth_jwt≠real_customer",
        "note": "Ops-minted JWT for authenticated Daily OS product proof; not a real invitee.",
    }
