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
from app.automation.types import ApplyOutcome, ApplyResult
from app.config import get_settings
from app.database.models import Application, Candidate, Job, User
from app.services.application_submission import (
    METHOD_DEMO_SIMULATED,
    record_submission_created_in_twin,
    record_submission_from_auto_apply,
)
from app.services.application_package_pdf import render_application_package_pdf
from app.services.cv_parser import CvParseError, extract_cv_text
from app.services.cv_tailoring import build_motivation_text_for_auto_apply, get_tailoring_pitch_for_job
from app.services.request_locale import is_polish_locale, normalize_locale
from app.services.investor_demo_seed import is_investor_demo_job
from app.services.s3_storage import get_s3_blob_store

logger = logging.getLogger(__name__)

_AUTO_APPLY_USER_MSG: dict[str, dict[str, str]] = {
    "en": {
        "no_candidate": "Complete your candidate profile first.",
        "job_not_found": "Job not found.",
        "no_cv_text": "Upload a CV or wait for text extraction — auto-apply needs CV content.",
        "no_cv_file": "No CV file to attach (upload a CV in your profile).",
        "pdf_build_failed": "Could not build a PDF or find the original CV file.",
        "server_interrupted": (
            "Auto-apply stopped on the server (e.g. browser error or portal page change). "
            "Use Apply to open the listing in a new tab and finish manually."
        ),
        "demo_simulated": (
            "Demo: application saved in TWIN (test listing — not sent to Pracuj.pl). "
            "Check Applications on your dashboard."
        ),
    },
    "pl": {
        "no_candidate": "Uzupełnij profil kandydata.",
        "job_not_found": "Nie znaleziono oferty.",
        "no_cv_text": "Wgraj CV lub poczekaj na przetworzenie tekstu — auto-apply wymaga treści życiorysu.",
        "no_cv_file": "Brak pliku CV do załączenia (wgraj CV w profilu).",
        "pdf_build_failed": "Nie udało się zbudować PDF ani znaleźć oryginalnego pliku CV.",
        "server_interrupted": (
            "Auto-apply przerwany na serwerze (np. błąd przeglądarki albo zmiana strony portalu). "
            "Użyj „Aplikuj”, żeby otworzyć ogłoszenie w nowej karcie i dokończyć wysyłkę ręcznie."
        ),
        "demo_simulated": (
            "Demo: aplikacja zapisana w TWIN (oferta testowa — bez wysyłki na Pracuj.pl). "
            "Sprawdź Aplikacje w panelu."
        ),
    },
}


def _auto_apply_msg(locale: str, key: str) -> str:
    loc = "pl" if is_polish_locale(locale) else "en"
    return _AUTO_APPLY_USER_MSG[loc][key]


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
    locale: str = "en",
) -> tuple[ApplyOutcome, str, Application | None]:
    loc = normalize_locale(locale)
    settings = get_settings()
    candidate = db.query(Candidate).filter(Candidate.user_id == user.id).first()
    if not candidate:
        return ApplyOutcome.FAILED, _auto_apply_msg(loc, "no_candidate"), None

    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        return ApplyOutcome.FAILED, _auto_apply_msg(loc, "job_not_found"), None

    if is_investor_demo_job(job):
        outcome = ApplyOutcome.FORM_FILLED if not submit else ApplyOutcome.SUBMITTED
        app = _upsert_application(db, candidate.id, job_id, job, outcome, demo_simulated=True)
        app.auto_applied = True
        app.application_method = METHOD_DEMO_SIMULATED
        db.add(app)
        db.commit()
        db.refresh(app)
        return outcome, _auto_apply_msg(loc, "demo_simulated"), app

    cv_text = _cv_text_for_apply(candidate)
    if not cv_text:
        return ApplyOutcome.FAILED, _auto_apply_msg(loc, "no_cv_text"), None

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
        locale=loc,
    ) or (get_tailoring_pitch_for_job(signals, job_id) or "")

    state_dir = _writable_state_dir(Path(settings.auto_apply_state_dir), user.id)

    package_pdf: Path | None = None
    pdf_bytes_for_s3: bytes | None = None
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
                locale=loc,
            )
            resume_path = str(package_pdf)
            try:
                pdf_bytes_for_s3 = package_pdf.read_bytes()
            except OSError:
                pdf_bytes_for_s3 = None
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
                return ApplyOutcome.FAILED, _auto_apply_msg(loc, "pdf_build_failed"), None

    if not resume_path or not Path(resume_path).is_file():
        return ApplyOutcome.FAILED, _auto_apply_msg(loc, "no_cv_file"), None

    result: ApplyResult
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
    except Exception:
        logger.exception(
            "run_auto_apply crashed job_id=%s board=%s user_id=%s",
            job_id,
            job.job_board,
            user.id,
        )
        result = ApplyResult(ApplyOutcome.FAILED, _auto_apply_msg(loc, "server_interrupted"))
    finally:
        if package_pdf and package_pdf.is_file():
            try:
                package_pdf.unlink()
            except OSError:
                logger.warning("Could not remove temp package PDF %s", package_pdf)

    app = _upsert_application(
        db,
        candidate.id,
        job_id,
        job,
        result.outcome,
        submit=submit,
        failure_reason=result.message if result.outcome == ApplyOutcome.FAILED else None,
        message=result.message,
    )
    if pdf_bytes_for_s3 and get_s3_blob_store().enabled:
        store = get_s3_blob_store()
        ts = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        key = f"auto_apply_packages/u{user.id}/a{app.id}_{ts}.pdf"
        if store.put_bytes(key=key, data=pdf_bytes_for_s3, content_type="application/pdf"):
            app.auto_apply_package_s3_key = key
            app.auto_apply_package_uploaded_at = datetime.utcnow()
            db.add(app)
            db.commit()
            db.refresh(app)
    return result.outcome, result.message, app


def _upsert_application(
    db: Session,
    candidate_id: int,
    job_id: int,
    job: Job,
    outcome: ApplyOutcome,
    *,
    submit: bool = False,
    demo_simulated: bool = False,
    failure_reason: str | None = None,
    message: str | None = None,
) -> Application:
    app = (
        db.query(Application)
        .filter(Application.candidate_id == candidate_id, Application.job_id == job_id)
        .first()
    )
    if not app:
        app = Application(candidate_id=candidate_id, job_id=job_id)
        db.add(app)
        record_submission_created_in_twin(app)

    record_submission_from_auto_apply(
        app,
        outcome=outcome,
        submit=submit,
        job=job,
        demo_simulated=demo_simulated,
        failure_reason=failure_reason,
        message=message,
    )
    if not demo_simulated:
        note = "auto-apply"
        app.notes = f"{app.notes or ''}; {note}".strip("; ").strip() if app.notes else note
        app.application_method = "auto_apply"
    elif outcome == ApplyOutcome.NEEDS_HUMAN:
        suffix = "wymaga weryfikacji CAPTCHA"
        app.notes = f"{app.notes}; {suffix}" if app.notes else suffix

    db.commit()
    db.refresh(app)
    return app
