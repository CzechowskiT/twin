"""Epic 2.10 API — pilot operations, support, feedback, diagnostics, dry-run gates."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.core.deps import get_current_user, get_db
from app.database.models import Candidate, User
from app.services import diagnostic_envelope as diag
from app.services import pilot_hard_caps as caps
from app.services import pilot_metric_contracts as metrics
from app.services import pilot_operations as ops
from app.services import pilot_runtime as runtime
from app.services import pilot_support_ops as support

router = APIRouter()
admin_router = APIRouter()


def _candidate(db: Session, user: User) -> Candidate:
    cand = db.query(Candidate).filter(Candidate.user_id == user.id).one_or_none()
    if cand is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="candidate_not_found")
    return cand


def _require_ops(settings: Settings, authorization: str | None) -> None:
    token = settings.ops_admin_token.strip() or settings.beta_admin_token.strip()
    if not token:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, detail="Ops admin token not configured")
    if (authorization or "").strip() != f"Bearer {token}":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid admin token")


class ProblemIn(BaseModel):
    category: str = Field(default="other", max_length=64)
    subject: str = Field(default="Problem report", max_length=200)
    body_text: str | None = Field(default=None, max_length=2000)
    diagnostic: dict | None = None
    diagnostic_opt_in: bool = False
    locale: str = Field(default="en", max_length=8)


class FeedbackIn(BaseModel):
    category: str = Field(default="ux", max_length=64)
    message: str | None = Field(default=None, max_length=2000)
    rating: int | None = Field(default=None, ge=1, le=5)
    page_path: str | None = Field(default=None, max_length=300)


class TransitionIn(BaseModel):
    status: str = Field(max_length=32)
    closed_reason: str | None = Field(default=None, max_length=120)


class DiagnosticPreviewIn(BaseModel):
    diagnostic: dict | None = None
    diagnostic_opt_in: bool = False


class ManifestDryRunIn(BaseModel):
    manifest: dict | None = None


class DecisionDryRunIn(BaseModel):
    decision: str = Field(max_length=32)
    target_state: str | None = Field(default=None, max_length=48)


@router.get("/me/pilot-operations")
def get_ops_aggregate(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = db.query(Candidate).filter(Candidate.user_id == user.id).one_or_none()
    return ops.build_ops_aggregate(
        db, user_id=user.id, candidate_id=cand.id if cand else None
    )


@router.get("/me/pilot-operations/help")
def get_help(
    locale: str = "en",
    user: User = Depends(get_current_user),
) -> dict:
    _ = user
    return support.help_center_content(locale=locale)


@router.get("/me/pilot-operations/recovery/{journey}")
def get_recovery(journey: str, user: User = Depends(get_current_user)) -> dict:
    _ = user
    return {"journey": journey, "steps": support.recovery_guidance(journey=journey), "kpi_excluded": True}


@router.post("/me/pilot-operations/diagnostic/preview")
def preview_diagnostic(
    body: DiagnosticPreviewIn,
    user: User = Depends(get_current_user),
) -> dict:
    _ = user
    return diag.build_preview_envelope(body.diagnostic, opt_in=body.diagnostic_opt_in)


@router.post("/me/pilot-operations/problems")
def post_problem(
    body: ProblemIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    out = support.create_problem_report(
        db,
        candidate_id=cand.id,
        user_id=user.id,
        category=body.category,
        subject=body.subject,
        body_text=body.body_text,
        diagnostic_raw=body.diagnostic,
        diagnostic_opt_in=body.diagnostic_opt_in,
        locale=body.locale,
    )
    if not out.get("ok"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail=out.get("reason") or "rejected")
    return out


@router.get("/me/pilot-operations/problems")
def list_problems(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return {"cases": support.list_cases(db, candidate_id=cand.id), "kpi_excluded": True}


@router.post("/me/pilot-operations/problems/{case_id}/transition")
def transition_problem(
    case_id: int,
    body: TransitionIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    out = support.transition_case(
        db,
        candidate_id=cand.id,
        case_id=case_id,
        new_status=body.status,
        closed_reason=body.closed_reason,
        actor="candidate",
    )
    if not out.get("ok"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=out.get("reason") or "rejected")
    return out


@router.post("/me/pilot-operations/feedback")
def post_feedback(
    body: FeedbackIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return support.create_feedback(
        db,
        candidate_id=cand.id,
        user_id=user.id,
        category=body.category,
        message=body.message,
        rating=body.rating,
        page_path=body.page_path,
    )


@router.get("/me/pilot-operations/feedback")
def get_feedback(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return {"items": support.list_feedback(db, candidate_id=cand.id), "kpi_excluded": True}


@router.post("/me/pilot-operations/feedback/{feedback_id}/withdraw")
def withdraw_fb(
    feedback_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    out = support.withdraw_feedback(db, candidate_id=cand.id, feedback_id=feedback_id)
    if not out.get("ok"):
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=out.get("reason") or "not_found")
    return out


@router.get("/me/pilot-operations/first-value")
def get_first_value(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = db.query(Candidate).filter(Candidate.user_id == user.id).one_or_none()
    return metrics.derive_first_value(
        db, user_id=user.id, candidate_id=cand.id if cand else None
    )


@router.get("/me/pilot-operations/metrics")
def get_metrics(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    _ = user
    return metrics.registry_payload(db)


@router.get("/me/pilot-operations/runtime")
def get_runtime(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    _ = user
    return runtime.runtime_snapshot(db)


@router.get("/me/pilot-operations/caps")
def get_caps(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    _ = user
    return caps.caps_snapshot(db)


# --- Ops admin (no PII) ---


@admin_router.get("/pilot-operations/quality")
def admin_quality(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None),
) -> dict:
    _require_ops(settings, authorization)
    return ops.ops_quality_view(db)


@admin_router.post("/pilot-operations/manifest/validate-dry-run")
def admin_manifest_dry_run(
    body: ManifestDryRunIn,
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None),
) -> dict:
    _require_ops(settings, authorization)
    return ops.validate_manifest_dry_run(body.manifest)


@admin_router.post("/pilot-operations/decisions/dry-run")
def admin_decision_dry_run(
    body: DecisionDryRunIn,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None),
) -> dict:
    _require_ops(settings, authorization)
    return ops.dry_run_decision(db, decision=body.decision, target_state=body.target_state)


@admin_router.post("/pilot-operations/incident/synthetic-exercise")
def admin_incident_exercise(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None),
) -> dict:
    _require_ops(settings, authorization)
    return ops.run_synthetic_incident_exercise(db)
