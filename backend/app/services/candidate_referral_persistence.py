"""Persistent candidate referral program — one program per candidate, tracked referrals."""

from __future__ import annotations

import secrets
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database.models import (
    AccountReferral,
    Candidate,
    CandidateReferral,
    CandidateReferralProgram,
    User,
)
from app.services.referral_program import count_first_payment_qualified_referrals
from app.services.referral_public_token import ensure_user_referral_public_token

ALLOWED_STATUSES = frozenset({"pending", "signed_up", "qualified", "void"})
MANUAL_PROCESSING_NOTICE = (
    "Referral rewards and qualification are tracked manually — no automatic payouts or outreach."
)
NO_OUTREACH_NOTICE = "TWIN does not email your invite list — you share the link yourself."
PILOT_LABEL = True


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _token_candidate() -> str:
    raw = secrets.token_urlsafe(12).replace("=", "")
    if len(raw) < 12:
        raw = secrets.token_urlsafe(16).replace("=", "")
    return raw[:16]


def _normalize_email(raw: str) -> str:
    return raw.strip().lower()[:320]


def get_program_row(db: Session, *, candidate_id: int) -> CandidateReferralProgram | None:
    return (
        db.query(CandidateReferralProgram)
        .filter(CandidateReferralProgram.candidate_id == candidate_id)
        .first()
    )


def _allocate_code(db: Session, *, user: User, candidate_id: int) -> str:
    existing = ensure_user_referral_public_token(db, user)
    if existing:
        taken = (
            db.query(CandidateReferralProgram.id)
            .filter(
                CandidateReferralProgram.referral_code == existing,
                CandidateReferralProgram.candidate_id != candidate_id,
            )
            .first()
        )
        if not taken:
            return existing
    for _ in range(40):
        cand = _token_candidate()
        if not db.query(CandidateReferralProgram.id).filter(CandidateReferralProgram.referral_code == cand).first():
            if not db.query(User.id).filter(User.referral_public_token == cand).first():
                return cand
    raise RuntimeError("Could not allocate referral_code")


def ensure_referral_program(
    db: Session,
    *,
    candidate: Candidate,
    user: User,
) -> tuple[CandidateReferralProgram, bool]:
    row = get_program_row(db, candidate_id=candidate.id)
    if row:
        ensure_user_referral_public_token(db, user)
        if user.referral_public_token and user.referral_public_token != row.referral_code:
            conflict = (
                db.query(CandidateReferralProgram.id)
                .filter(
                    CandidateReferralProgram.referral_code == user.referral_public_token,
                    CandidateReferralProgram.id != row.id,
                )
                .first()
            )
            if not conflict:
                row.referral_code = user.referral_public_token
                row.updated_at = _utcnow()
                db.add(row)
        return row, False
    code = _allocate_code(db, user=user, candidate_id=candidate.id)
    ensure_user_referral_public_token(db, user)
    if not user.referral_public_token:
        user.referral_public_token = code
        db.add(user)
    elif user.referral_public_token != code:
        code = user.referral_public_token
    row = CandidateReferralProgram(
        candidate_id=candidate.id,
        referral_code=code,
        created_at=_utcnow(),
        updated_at=_utcnow(),
    )
    db.add(row)
    db.flush()
    return row, True


def _count_by_status(db: Session, *, program_id: int, status: str) -> int:
    return (
        db.query(func.count(CandidateReferral.id))
        .filter(CandidateReferral.program_id == program_id, CandidateReferral.status == status)
        .scalar()
        or 0
    )


def _serialize_program(db: Session, row: CandidateReferralProgram) -> dict[str, Any]:
    total = (
        db.query(func.count(CandidateReferral.id))
        .filter(CandidateReferral.program_id == row.id)
        .scalar()
        or 0
    )
    return {
        "candidate_id": row.candidate_id,
        "referral_code": row.referral_code,
        "share_path": f"/register?ref={row.referral_code}",
        "total_referrals": int(total),
        "pending_invites": _count_by_status(db, program_id=row.id, status="pending"),
        "signed_up_count": _count_by_status(db, program_id=row.id, status="signed_up"),
        "qualified_count": _count_by_status(db, program_id=row.id, status="qualified"),
        "created_at": row.created_at,
        "updated_at": row.updated_at,
    }


def _serialize_referral(row: CandidateReferral) -> dict[str, Any]:
    return {
        "id": row.id,
        "status": row.status,
        "invite_email": row.invite_email,
        "referred_user_id": row.referred_user_id,
        "ref_code_used": row.ref_code_used,
        "created_at": row.created_at,
        "signed_up_at": row.signed_up_at,
    }


def build_referrals_summary(
    db: Session,
    *,
    candidate: Candidate,
    user: User,
    limit: int = 50,
    offset: int = 0,
) -> dict[str, Any]:
    program, _ = ensure_referral_program(db, candidate=candidate, user=user)
    rows = (
        db.query(CandidateReferral)
        .filter(CandidateReferral.program_id == program.id)
        .order_by(CandidateReferral.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return {
        "program": _serialize_program(db, program),
        "referrals": [_serialize_referral(r) for r in rows],
        "manual_processing_notice": MANUAL_PROCESSING_NOTICE,
        "pilot_labelled": PILOT_LABEL,
    }


def get_referral_by_id(
    db: Session,
    *,
    program_id: int,
    referral_id: int,
) -> dict[str, Any] | None:
    row = (
        db.query(CandidateReferral)
        .filter(CandidateReferral.program_id == program_id, CandidateReferral.id == referral_id)
        .first()
    )
    if not row:
        return None
    return _serialize_referral(row)


def record_invite(
    db: Session,
    *,
    program: CandidateReferralProgram,
    invite_email: str,
) -> dict[str, Any]:
    email = _normalize_email(invite_email)
    if not email or "@" not in email:
        raise ValueError("invalid_email")
    existing = (
        db.query(CandidateReferral)
        .filter(
            CandidateReferral.program_id == program.id,
            CandidateReferral.invite_email == email,
            CandidateReferral.status == "pending",
        )
        .first()
    )
    if existing:
        return _serialize_referral(existing)
    row = CandidateReferral(
        program_id=program.id,
        invite_email=email,
        status="pending",
        created_at=_utcnow(),
    )
    db.add(row)
    program.updated_at = _utcnow()
    db.add(program)
    db.flush()
    return _serialize_referral(row)


def resolve_referrer_user_id_from_candidate_code(
    db: Session,
    *,
    code: str | None,
    new_user_email: str,
) -> int | None:
    if not code:
        return None
    token = code.strip()[:32]
    if not token:
        return None
    program = (
        db.query(CandidateReferralProgram)
        .filter(CandidateReferralProgram.referral_code == token)
        .first()
    )
    if not program:
        return None
    candidate = db.query(Candidate).filter(Candidate.id == program.candidate_id).first()
    if not candidate:
        return None
    referrer = db.query(User).filter(User.id == candidate.user_id, User.is_active.is_(True)).first()
    if not referrer:
        return None
    if referrer.email.strip().lower() == new_user_email.strip().lower():
        return None
    return int(referrer.id)


def preview_candidate_referral_code(db: Session, *, code: str) -> dict[str, Any] | None:
    token = code.strip()[:32]
    if not token:
        return None
    program = (
        db.query(CandidateReferralProgram)
        .filter(CandidateReferralProgram.referral_code == token)
        .first()
    )
    if not program:
        return None
    candidate = db.query(Candidate).filter(Candidate.id == program.candidate_id).first()
    if not candidate:
        return None
    name = (candidate.name or "TWIN member").strip()[:80]
    return {"display_name": name, "referral_code": program.referral_code, "valid": True}


def attach_signup_to_candidate_referral(
    db: Session,
    *,
    referrer_user_id: int,
    referred_user_id: int,
    ref_code_used: str | None,
) -> CandidateReferral | None:
    if referrer_user_id == referred_user_id:
        return None
    candidate = db.query(Candidate).filter(Candidate.user_id == referrer_user_id).first()
    if not candidate:
        return None
    program = get_program_row(db, candidate_id=candidate.id)
    if not program:
        return None
    if ref_code_used and program.referral_code != ref_code_used.strip()[:32]:
        return None
    existing = (
        db.query(CandidateReferral)
        .filter(CandidateReferral.referred_user_id == referred_user_id)
        .first()
    )
    if existing:
        return existing
    now = _utcnow()
    invite_match = None
    if ref_code_used:
        referred = db.query(User).filter(User.id == referred_user_id).first()
        if referred:
            invite_match = (
                db.query(CandidateReferral)
                .filter(
                    CandidateReferral.program_id == program.id,
                    CandidateReferral.invite_email == referred.email.strip().lower(),
                    CandidateReferral.status == "pending",
                )
                .first()
            )
    if invite_match:
        invite_match.referred_user_id = referred_user_id
        invite_match.status = "signed_up"
        invite_match.ref_code_used = ref_code_used
        invite_match.signed_up_at = now
        db.add(invite_match)
        program.updated_at = now
        db.add(program)
        return invite_match
    row = CandidateReferral(
        program_id=program.id,
        referred_user_id=referred_user_id,
        status="signed_up",
        ref_code_used=ref_code_used,
        created_at=now,
        signed_up_at=now,
    )
    db.add(row)
    program.updated_at = now
    db.add(program)
    db.flush()
    return row


def sync_qualified_referral_status(db: Session, *, referrer_user_id: int) -> None:
    """Mark candidate referrals qualified when account referral qualifies for first payment."""
    n_qual = count_first_payment_qualified_referrals(db, referrer_user_id)
    if n_qual <= 0:
        return
    candidate = db.query(Candidate).filter(Candidate.user_id == referrer_user_id).first()
    if not candidate:
        return
    program = get_program_row(db, candidate_id=candidate.id)
    if not program:
        return
    qualified_user_ids = {
        int(r.referred_user_id)
        for r in db.query(AccountReferral)
        .filter(AccountReferral.referrer_user_id == referrer_user_id)
        .all()
        if r.referred_user_id
    }
    rows = (
        db.query(CandidateReferral)
        .filter(
            CandidateReferral.program_id == program.id,
            CandidateReferral.status == "signed_up",
            CandidateReferral.referred_user_id.in_(qualified_user_ids),
        )
        .all()
    )
    now = _utcnow()
    for row in rows:
        row.status = "qualified"
        db.add(row)
    if rows:
        program.updated_at = now
        db.add(program)
