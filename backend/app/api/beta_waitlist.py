"""Public beta waitlist (no JWT — referral_code is the dashboard secret)."""

from __future__ import annotations

import csv
import io
import re
import secrets
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, File, Header, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.database.models import BetaReferral, BetaWaitlist, Job
from app.database.session import get_db
from app.matching.matcher import calculate_match_score
from app.scrapers.registry import GLOBAL_BOARD_SPECS
from app.services.beta_waitlist_mail import send_beta_waitlist_welcome_email
from app.schemas.beta_waitlist import (
    BetaActionOut,
    BetaAdminStatsOut,
    BetaDashboardOut,
    BetaJoinIn,
    BetaJoinOut,
    BetaLeaderboardEntry,
    BetaLeaderboardOut,
    BetaMatchItem,
    BetaMatchPreviewOut,
    BetaProfileUpdate,
    BetaStatsOut,
)

router = APIRouter()


def _slug_code(raw: str) -> str:
    return raw.strip().lower()


def _new_referral_code(db: Session) -> str:
    for _ in range(16):
        code = secrets.token_hex(4).lower()
        if not db.query(BetaWaitlist).filter(BetaWaitlist.referral_code == code).first():
            return code
    raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Referral code allocation failed")


def _queue_position(db: Session, entry: BetaWaitlist) -> int:
    ahead = (
        db.query(func.count(BetaWaitlist.id))
        .filter(
            or_(
                BetaWaitlist.priority_points > entry.priority_points,
                and_(BetaWaitlist.priority_points == entry.priority_points, BetaWaitlist.id < entry.id),
            )
        )
        .scalar()
    )
    return int(ahead or 0) + 1


def _waitlist_entry(db: Session, referral_code: str) -> BetaWaitlist:
    row = db.query(BetaWaitlist).filter(BetaWaitlist.referral_code == _slug_code(referral_code)).first()
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Waitlist entry not found")
    return row


def _apply_referrer_bonus(db: Session, referred_by: str | None, referee: BetaWaitlist) -> None:
    if not referred_by:
        return
    ref = db.query(BetaWaitlist).filter(BetaWaitlist.referral_code == _slug_code(referred_by)).first()
    if not ref or ref.id == referee.id:
        return
    ref.priority_points += 5
    db.add(ref)
    db.add(BetaReferral(referrer_code=ref.referral_code, referee_waitlist_id=referee.id))


def _display_name(name: str | None, email: str) -> str:
    if name and name.strip():
        parts = name.strip().split()
        if len(parts) >= 2:
            return f"{parts[0]} {parts[-1][0]}."
        return parts[0]
    local = email.split("@", 1)[0]
    return local[:1].upper() + local[1:3] if len(local) > 1 else local.upper()


def _leaderboard_reward(rank: int) -> str:
    """Neutral queue perk label — not a cash payout (EN; matches frontend `WAITLIST_LEADERBOARD_REWARD_EN`)."""
    _ = rank
    return "Priority founding access"


def _anonym_caption(name: str | None, location: str | None, job_title: str | None) -> str:
    loc = location or "—"
    role = job_title or "Beta"
    if not name or not name.strip():
        return f"Someone joined ({loc}, {role})"
    parts = name.strip().split()
    initials = (parts[0][0] + (parts[-1][0] if len(parts) > 1 else "")).upper()
    return f"{initials}. joined ({loc}, {role})"


def _job_dict(job: Job) -> dict:
    return {
        "title": job.title,
        "requirements": job.requirements,
        "description": job.description,
        "location": job.location,
        "salary_min": job.salary_min,
        "salary_max": job.salary_max,
    }


def _match_preview_rows(db: Session, title: str, limit: int = 3) -> list[BetaMatchItem]:
    title = title.strip()
    if len(title) < 2:
        return []
    candidate = {
        "skills": [],
        "preferred_job_titles": [title],
        "experience_years": 5,
        "location": None,
        "desired_salary": None,
        "cv_text": None,
    }
    jobs = (
        db.query(Job)
        .filter(Job.is_validated.is_(True))
        .order_by(Job.scraped_at.desc())
        .limit(120)
        .all()
    )
    scored: list[tuple[float, Job]] = []
    for j in jobs:
        s = calculate_match_score(candidate, _job_dict(j))
        scored.append((s, j))
    scored.sort(key=lambda x: x[0], reverse=True)
    out: list[BetaMatchItem] = []
    for s, j in scored[:limit]:
        if s < 15:
            continue
        out.append(
            BetaMatchItem(
                score=s,
                title=j.title,
                company=j.company,
                location=j.location,
                job_board=j.job_board,
                url=j.url,
            )
        )
    return out[:limit]


def _require_beta_admin(settings: Settings, authorization: str | None) -> None:
    if not settings.beta_admin_token.strip():
        raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, detail="BETA_ADMIN_TOKEN not configured")
    if (authorization or "").strip() != f"Bearer {settings.beta_admin_token}":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid admin token")


def _signups_today_count(db: Session) -> int:
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    return int(
        db.query(func.count(BetaWaitlist.id)).filter(BetaWaitlist.created_at >= today_start).scalar() or 0
    )


@router.get("/stats", response_model=BetaStatsOut)
def beta_stats(db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> BetaStatsOut:
    total = int(db.query(func.count(BetaWaitlist.id)).scalar() or 0)
    jobs_n = int(db.query(func.count(Job.id)).scalar() or 0)
    boards_n = len(GLOBAL_BOARD_SPECS)
    signups_today = _signups_today_count(db)
    recent_rows = db.query(BetaWaitlist).order_by(BetaWaitlist.id.desc()).limit(18).all()
    recent = [_anonym_caption(r.name, r.location, r.job_title) for r in reversed(recent_rows)]
    ends = settings.beta_campaign_ends_at.strip() or None
    return BetaStatsOut(
        total_signups=total,
        cap=settings.beta_waitlist_cap,
        spots_left=max(0, settings.beta_waitlist_cap - total),
        signups_today=signups_today,
        validated_jobs=jobs_n,
        job_boards=boards_n,
        recent=recent,
        campaign_ends_at=ends,
    )


@router.get("/leaderboard", response_model=BetaLeaderboardOut)
def beta_leaderboard(db: Session = Depends(get_db), limit: int = 10) -> BetaLeaderboardOut:
    cap = min(50, max(1, limit))
    rows = (
        db.query(BetaReferral.referrer_code, func.count(BetaReferral.id).label("cnt"))
        .group_by(BetaReferral.referrer_code)
        .order_by(func.count(BetaReferral.id).desc())
        .limit(cap)
        .all()
    )
    out: list[BetaLeaderboardEntry] = []
    for idx, (code, cnt) in enumerate(rows, start=1):
        ref = db.query(BetaWaitlist).filter(BetaWaitlist.referral_code == code).first()
        if not ref:
            continue
        out.append(
            BetaLeaderboardEntry(
                rank=idx,
                display_name=_display_name(ref.name, ref.email),
                referrals=int(cnt),
                reward=_leaderboard_reward(idx),
            )
        )
    return BetaLeaderboardOut(leaderboard=out)


@router.get("/match-preview", response_model=BetaMatchPreviewOut)
def beta_match_preview(title: str, db: Session = Depends(get_db)) -> BetaMatchPreviewOut:
    matches = _match_preview_rows(db, title, 3)
    return BetaMatchPreviewOut(title_query=title.strip(), matches=matches)


@router.post("/join", response_model=BetaJoinOut)
def beta_join(body: BetaJoinIn, db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> BetaJoinOut:
    total = int(db.query(func.count(BetaWaitlist.id)).scalar() or 0)
    if total >= settings.beta_waitlist_cap:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Beta waitlist is full")
    if not body.accept_privacy_notice or not body.consent_beta_email_updates:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail="Privacy acknowledgement and email consent are required to join the waitlist",
        )
    email = str(body.email).lower().strip()
    existing = db.query(BetaWaitlist).filter(BetaWaitlist.email == email).first()
    if existing:
        n = int(db.query(func.count(BetaWaitlist.id)).scalar() or 0)
        return BetaJoinOut(
            referral_code=existing.referral_code,
            position=_queue_position(db, existing),
            priority_points=existing.priority_points,
            spots_left=max(0, settings.beta_waitlist_cap - n),
            total_signups=n,
            welcome_email_sent=False,
        )
    code = _new_referral_code(db)
    ref_in = _slug_code(body.referred_by) if body.referred_by else None
    row = BetaWaitlist(
        email=email,
        name=body.name,
        referral_code=code,
        referred_by_code=ref_in,
        source=(body.source or "email")[:32],
        privacy_and_email_consent_at=datetime.now(timezone.utc),
    )
    db.add(row)
    db.flush()
    _apply_referrer_bonus(db, ref_in, row)
    db.commit()
    db.refresh(row)
    n2 = int(db.query(func.count(BetaWaitlist.id)).scalar() or 0)
    pos = _queue_position(db, row)
    locale = (body.locale or "en").strip().lower()[:8]
    mail_sent = send_beta_waitlist_welcome_email(
        settings,
        to_email=row.email,
        referral_code=row.referral_code,
        position=pos,
        locale=locale,
    )
    return BetaJoinOut(
        referral_code=row.referral_code,
        position=pos,
        priority_points=row.priority_points,
        spots_left=max(0, settings.beta_waitlist_cap - n2),
        total_signups=n2,
        welcome_email_sent=mail_sent,
    )


@router.get("/waitlist/{referral_code}", response_model=BetaDashboardOut)
def beta_dashboard(
    referral_code: str,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> BetaDashboardOut:
    row = _waitlist_entry(db, referral_code)
    n = int(db.query(func.count(BetaWaitlist.id)).scalar() or 0)
    refs = int(
        db.query(func.count(BetaReferral.id)).filter(BetaReferral.referrer_code == row.referral_code).scalar() or 0
    )
    ends = settings.beta_campaign_ends_at.strip() or None
    return BetaDashboardOut(
        referral_code=row.referral_code,
        position=_queue_position(db, row),
        priority_points=row.priority_points,
        spots_left=max(0, settings.beta_waitlist_cap - n),
        total_signups=n,
        referrals_count=refs,
        linkedin_shared=row.linkedin_shared,
        cv_uploaded=row.cv_uploaded,
        voice_recorded=row.voice_recorded,
        testimonial_posted=row.testimonial_posted,
        job_title=row.job_title,
        location=row.location,
        min_salary=row.min_salary,
        campaign_ends_at=ends,
    )


@router.patch("/waitlist/{referral_code}/profile", response_model=BetaDashboardOut)
def beta_update_profile(
    referral_code: str,
    body: BetaProfileUpdate,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> BetaDashboardOut:
    row = _waitlist_entry(db, referral_code)
    if body.job_title is not None:
        row.job_title = body.job_title[:255] if body.job_title else None
    if body.location is not None:
        row.location = body.location[:255] if body.location else None
    if body.min_salary is not None:
        row.min_salary = body.min_salary
    db.add(row)
    db.commit()
    db.refresh(row)
    return beta_dashboard(referral_code, db, settings)  # type: ignore[arg-type]


@router.post("/waitlist/{referral_code}/linkedin-share", response_model=BetaActionOut)
def beta_linkedin_share(
    referral_code: str,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> BetaActionOut:
    row = _waitlist_entry(db, referral_code)
    if not row.linkedin_shared:
        row.linkedin_shared = True
        row.priority_points += 5
        db.add(row)
        db.commit()
        db.refresh(row)
    return BetaActionOut(position=_queue_position(db, row), priority_points=row.priority_points)


@router.post("/waitlist/{referral_code}/testimonial", response_model=BetaActionOut)
def beta_testimonial(
    referral_code: str,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> BetaActionOut:
    row = _waitlist_entry(db, referral_code)
    if not row.testimonial_posted:
        row.testimonial_posted = True
        row.priority_points += 50
        db.add(row)
        db.commit()
        db.refresh(row)
    return BetaActionOut(position=_queue_position(db, row), priority_points=row.priority_points)


def _save_upload(settings: Settings, referral_code: str, kind: str, file: UploadFile, content: bytes) -> str:
    if len(content) > settings.beta_upload_max_bytes:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File too large")
    safe = re.sub(r"[^a-zA-Z0-9._-]", "_", file.filename or "upload")
    base = Path(settings.beta_upload_dir)
    base.mkdir(parents=True, exist_ok=True)
    path = base / f"{_slug_code(referral_code)}_{kind}_{safe}"
    path.write_bytes(content)
    return str(path)


@router.post("/waitlist/{referral_code}/cv", response_model=BetaActionOut)
async def beta_upload_cv(
    referral_code: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> BetaActionOut:
    row = _waitlist_entry(db, referral_code)
    raw = await file.read()
    if not raw:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Empty file")
    path = _save_upload(settings, referral_code, "cv", file, raw)
    if not row.cv_uploaded:
        row.cv_uploaded = True
        row.priority_points += 3
    row.cv_path = path
    db.add(row)
    db.commit()
    db.refresh(row)
    title = row.job_title or "Product Manager"
    matches = _match_preview_rows(db, title, 3)
    return BetaActionOut(
        position=_queue_position(db, row),
        priority_points=row.priority_points,
        matches=matches,
    )


@router.post("/waitlist/{referral_code}/voice", response_model=BetaActionOut)
async def beta_upload_voice(
    referral_code: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> BetaActionOut:
    row = _waitlist_entry(db, referral_code)
    raw = await file.read()
    if not raw:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Empty file")
    path = _save_upload(settings, referral_code, "voice", file, raw)
    if not row.voice_recorded:
        row.voice_recorded = True
        row.priority_points += 50
    row.voice_path = path
    db.add(row)
    db.commit()
    db.refresh(row)
    return BetaActionOut(position=_queue_position(db, row), priority_points=row.priority_points)


@router.get("/admin/stats", response_model=BetaAdminStatsOut)
def beta_admin_stats(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(None),
) -> BetaAdminStatsOut:
    _require_beta_admin(settings, authorization)
    total = int(db.query(func.count(BetaWaitlist.id)).scalar() or 0)
    linkedin_n = int(db.query(func.count(BetaWaitlist.id)).filter(BetaWaitlist.linkedin_shared.is_(True)).scalar() or 0)
    cv_n = int(db.query(func.count(BetaWaitlist.id)).filter(BetaWaitlist.cv_uploaded.is_(True)).scalar() or 0)
    voice_n = int(db.query(func.count(BetaWaitlist.id)).filter(BetaWaitlist.voice_recorded.is_(True)).scalar() or 0)
    by_source: dict[str, int] = {}
    for src, c in (
        db.query(BetaWaitlist.source, func.count(BetaWaitlist.id)).group_by(BetaWaitlist.source).all()
    ):
        key = src or "unknown"
        by_source[key] = int(c)
    ref_rows = int(db.query(func.count(BetaReferral.id)).scalar() or 0)
    top_q = (
        db.query(BetaReferral.referrer_code, func.count(BetaReferral.id).label("cnt"))
        .group_by(BetaReferral.referrer_code)
        .order_by(func.count(BetaReferral.id).desc())
        .limit(15)
        .all()
    )
    top_referrers = [{"referrer_code": str(r[0]), "referrals": int(r[1])} for r in top_q]
    return BetaAdminStatsOut(
        total_signups=total,
        cap=settings.beta_waitlist_cap,
        spots_left=max(0, settings.beta_waitlist_cap - total),
        signups_today=_signups_today_count(db),
        linkedin_shared=linkedin_n,
        cv_uploaded=cv_n,
        voice_recorded=voice_n,
        by_source=by_source,
        referral_rows=ref_rows,
        top_referrers=top_referrers,
    )


@router.get("/admin/export")
def beta_admin_export(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(None),
) -> StreamingResponse:
    """CSV export of waitlist rows for ops (admin token required)."""
    _require_beta_admin(settings, authorization)
    rows = db.query(BetaWaitlist).order_by(BetaWaitlist.id).all()
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(
        [
            "id",
            "email",
            "name",
            "job_title",
            "location",
            "min_salary",
            "source",
            "referral_code",
            "referred_by_code",
            "priority_points",
            "linkedin_shared",
            "cv_uploaded",
            "voice_recorded",
            "created_at",
        ]
    )
    for row in rows:
        created = row.created_at.isoformat() if row.created_at else ""
        writer.writerow(
            [
                row.id,
                row.email,
                row.name or "",
                row.job_title or "",
                row.location or "",
                row.min_salary if row.min_salary is not None else "",
                row.source or "",
                row.referral_code,
                row.referred_by_code or "",
                row.priority_points,
                int(row.linkedin_shared),
                int(row.cv_uploaded),
                int(row.voice_recorded),
                created,
            ]
        )
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="beta_waitlist.csv"'},
    )
