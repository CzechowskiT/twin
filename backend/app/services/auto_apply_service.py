"""Orchestrate auto-apply for a candidate + job."""

from __future__ import annotations

import json
import logging
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session

from app.automation.apply_engine import run_auto_apply
from app.automation.types import ApplyOutcome
from app.config import get_settings
from app.database.models import Application, ApplicationStatus, Candidate, Job, User
from app.services.application_package_pdf import render_application_package_pdf
from app.services.cv_parser import CvParseError, extract_cv_text
from app.services.cv_tailoring import build_motivation_text_for_auto_apply, get_tailoring_pitch_for_job

logger = logging.getLogger(__name__)


def _job_context_text(job: Job) -> str:
    parts: list[str] = []
    if job.description:
        parts.append(job.description.strip())
    if job.requirements:
        parts.append(job.requirements.strip())
    return "\n\n".join(p for p in parts if p)[:9000]


def _cv_text_for_apply(candidate: Candidate) -> str | None:
    if candidate.cv_text and str(candidate.cv_text).strip():
        return str(candidate.cv_text).strip()
    if candidate.resume_path:
        rp = Path(candidate.resume_path)
        if rp.is_file():
            try:
                raw = rp.read_bytes()
                fn = candidate.cv_filename or rp.name
                return extract_cv_text(raw, fn).strip()
            except (CvParseError, OSError) as exc:
                logger.warning("Could not extract CV text from resume_path: %s", exc)
                return None
    return None


def _extra_consent_tuple(raw: str) -> tuple[str, ...] | None:
    if not raw or not str(raw).strip():
        return None
    chunks = [p.strip() for p in str(raw).split("\n\n") if p.strip()]
    return tuple(chunks) if chunks else None


def _writable_state_dir(base: Path, user_id: int) -> Path:
    """Prefer configured path; fall back to /tmp when the image filesystem is read-only (common on PaaS)."""
    rel = base / str(user_id)
    try:
        rel.mkdir(parents=True, exist_ok=True)
        probe = rel / ".twin_write_probe"
        probe.write_text("ok", encoding="utf-8")
        probe.unlink(missing_ok=True)
        return rel
    except OSError:
        logger.warning(
            "auto_apply_state_dir not writable (%s), using temp dir for user_id=%s",
            rel,
            user_id,
        )
    fallback = Path(tempfile.gettempdir()) / "twin_auto_apply_state" / str(user_id)
    fallback.mkdir(parents=True, exist_ok=True)
    return fallback


def auto_apply_for_user(
    db: Session,
    *,
    user: User,
    job_id: int,
    submit: bool,
) -> tuple[ApplyOutcome, str, Application | None]:
    settings = get_settings()
    candidate = db.query(Candidate).filter(Candidate.user_id == user.id).first()
    if not candidate:
        return ApplyOutcome.FAILED, "Uzupełnij profil kandydata.", None

    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        return ApplyOutcome.FAILED, "Nie znaleziono oferty.", None

    cv_text = _cv_text_for_apply(candidate)
    if not cv_text:
        return (
            ApplyOutcome.FAILED,
            "Wgraj CV lub poczekaj na przetworzenie tekstu — auto-apply wymaga treści życiorysu.",
            None,
        )

    signals: dict[str, Any] = {}
    if candidate.profile_signals_json:
        try:
            parsed = json.loads(candidate.profile_signals_json)
            signals = parsed if isinstance(parsed, dict) else {}
        except json.JSONDecodeError:
            signals = {}

    motivation = build_motivation_text_for_auto_apply(
        cv_text,
        job_title=job.title,
        company=job.company,
        job_context=_job_context_text(job),
    ) or (get_tailoring_pitch_for_job(signals, job_id) or "")

    state_dir = _writable_state_dir(Path(settings.auto_apply_state_dir), user.id)

    package_pdf: Path | None = None
    resume_path = candidate.resume_path
    if settings.auto_apply_tailored_pdf:
        try:
            package_pdf = state_dir / f"apply_pkg_{job_id}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}.pdf"
            render_application_package_pdf(
                package_pdf,
                candidate_name=candidate.name,
                job_title=job.title,
                job_company=job.company,
                job_board=job.job_board,
                motivation_text=motivation,
                cv_text=cv_text,
                extra_consent_paragraphs=_extra_consent_tuple(settings.auto_apply_consent_extra_pl),
                font_path_override=settings.auto_apply_font_path or None,
            )
            resume_path = str(package_pdf)
        except FileNotFoundError as exc:
            logger.warning("%s — używam oryginalnego CV.", exc)
            if candidate.resume_path and Path(candidate.resume_path).is_file():
                resume_path = candidate.resume_path
            else:
                return ApplyOutcome.FAILED, str(exc), None
        except Exception:
            logger.exception("Tailored PDF failed — falling back to original CV upload.")
            if candidate.resume_path and Path(candidate.resume_path).is_file():
                resume_path = candidate.resume_path
                package_pdf = None
            else:
                return (
                    ApplyOutcome.FAILED,
                    "Nie udało się zbudować PDF ani znaleźć oryginalnego pliku CV.",
                    None,
                )

    if not resume_path or not Path(resume_path).is_file():
        return ApplyOutcome.FAILED, "Brak pliku CV do załączenia (wgraj CV w profilu).", None

    try:
        result = run_auto_apply(
            job_board=job.job_board,
            job_url=job.url,
            name=candidate.name,
            email=user.email,
            phone=settings.auto_apply_default_phone,
            resume_path=resume_path,
            motivation_text=motivation or None,
            headless=settings.auto_apply_headless,
            state_dir=state_dir,
            submit=submit,
        )
    finally:
        if package_pdf and package_pdf.is_file():
            try:
                package_pdf.unlink()
            except OSError:
                logger.warning("Could not remove temp package PDF %s", package_pdf)

    app = _upsert_application(db, candidate.id, job_id, result.outcome)
    return result.outcome, result.message, app


def _upsert_application(
    db: Session,
    candidate_id: int,
    job_id: int,
    outcome: ApplyOutcome,
) -> Application:
    app = (
        db.query(Application)
        .filter(Application.candidate_id == candidate_id, Application.job_id == job_id)
        .first()
    )
    if not app:
        app = Application(candidate_id=candidate_id, job_id=job_id)
        db.add(app)

    if outcome in (ApplyOutcome.SUBMITTED, ApplyOutcome.FORM_FILLED):
        app.status = ApplicationStatus.APPLIED
        app.applied_at = app.applied_at or datetime.utcnow()
        note = "auto-apply"
        app.notes = f"{app.notes or ''}; {note}".strip("; ").strip()
    elif outcome == ApplyOutcome.NEEDS_HUMAN:
        app.status = ApplicationStatus.PENDING
        suffix = "wymaga weryfikacji CAPTCHA"
        app.notes = f"{app.notes}; {suffix}" if app.notes else suffix

    db.commit()
    db.refresh(app)
    return app
