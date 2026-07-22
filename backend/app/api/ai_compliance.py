"""Career Evidence Graph & AI Compliance API."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.database.models import User
from app.services import ai_compliance as svc

router = APIRouter()


class ClaimCreateIn(BaseModel):
    subject_type: str = Field(..., min_length=2, max_length=64)
    subject_id: str = Field(..., min_length=1, max_length=128)
    claim_type: str = Field(..., min_length=2, max_length=64)
    claim_key: str = Field(..., min_length=1, max_length=128)
    claim_value: str = Field(..., min_length=1, max_length=4000)
    status: str = Field(..., min_length=2, max_length=32)
    source_type: str = Field(..., min_length=2, max_length=64)
    actor_type: str = Field("human", min_length=2, max_length=32)
    tenant_id: int | None = None
    source_id: str | None = Field(None, max_length=128)
    source_uri: str | None = Field(None, max_length=500)
    confidence: float | None = Field(None, ge=0, le=1)
    confidence_method: str | None = Field(None, max_length=64)
    model_run_id: str | None = Field(None, max_length=64)
    prompt_version_id: str | None = Field(None, max_length=64)
    visibility_scope: str = Field("subject", max_length=64)


class TransitionIn(BaseModel):
    to_status: str = Field(..., min_length=2, max_length=32)
    reason_code: str | None = Field(None, max_length=64)
    notes: str | None = Field(None, max_length=500)
    tenant_id: int | None = None
    dispute_resolved: bool = False
    actor_type: str = Field("human", max_length=32)


class EvidenceCreateIn(BaseModel):
    evidence_type: str = Field(..., min_length=2, max_length=64)
    source_type: str = Field(..., min_length=2, max_length=64)
    tenant_id: int | None = None
    source_reference: str | None = Field(None, max_length=500)
    structured_payload: dict | None = None
    visibility_scope: str = Field("subject", max_length=64)


class LinkEvidenceIn(BaseModel):
    claim_id: str = Field(..., min_length=4, max_length=64)
    evidence_id: str = Field(..., min_length=4, max_length=64)
    link_role: str = Field("supports", max_length=64)
    explicit_multi_link: bool = False
    tenant_id: int | None = None


class DisputeIn(BaseModel):
    claim_id: str = Field(..., min_length=4, max_length=64)
    reason_code: str = Field(..., min_length=2, max_length=64)
    free_text: str | None = Field(None, max_length=2000)
    evidence_ids: list[str] = Field(default_factory=list)


class ResolveDisputeIn(BaseModel):
    resolution: str = Field(..., min_length=2, max_length=64)
    resolution_reason: str = Field(..., min_length=2, max_length=2000)
    to_claim_status: str = Field(..., min_length=2, max_length=32)


class SupersedeIn(BaseModel):
    new_value: str = Field(..., min_length=1, max_length=4000)
    reason_code: str = Field("correction", max_length=64)


class AiRunIn(BaseModel):
    ai_system_id: str = Field("twin_match_ranker_v1", max_length=64)
    prompt_template_id: str = Field("match_explain_v1", max_length=64)
    prompt_version: str = Field("1.0.0", max_length=32)
    model_version: str = Field("1.0.0", max_length=64)
    output_type: str = Field("recommendation", max_length=64)
    redacted_input: dict | None = None
    redacted_output: dict | None = None
    confidence: float | None = Field(None, ge=0, le=1)
    decision_impact: str = Field("advisory_only", max_length=64)
    created_claim_ids: list[str] = Field(default_factory=list)


class ExplanationIn(BaseModel):
    ai_run_id: str = Field(..., min_length=4, max_length=64)
    why: str = Field(..., min_length=2, max_length=4000)
    based_on: list[str] = Field(default_factory=list)
    data_used: list[str] = Field(default_factory=list)
    data_not_used: list[str] = Field(default_factory=lambda: ["protected_attributes"])
    key_factors: list[str] = Field(default_factory=list)
    limitations: str | None = Field(None, max_length=2000)
    confidence: float | None = Field(None, ge=0, le=1)
    completeness: str = Field("PARTIAL", max_length=32)


class ReviewIn(BaseModel):
    ai_run_id: str = Field(..., min_length=4, max_length=64)
    final_outcome: str = Field(..., min_length=2, max_length=64)
    reason_code: str = Field(..., min_length=2, max_length=64)
    justification: str = Field(..., min_length=2, max_length=4000)
    claim_id: str | None = Field(None, max_length=64)


class GuardProbeIn(BaseModel):
    kind: str = Field(..., pattern=r"^(prohibited_use|protected_attr|prompt_injection|autonomous_employment)$")
    use_key: str | None = Field(None, max_length=128)
    attribute: str | None = Field(None, max_length=64)
    source: str | None = Field(None, max_length=64)
    text: str | None = Field(None, max_length=4000)
    action: str | None = Field(None, max_length=64)


class EvidenceMarkIn(BaseModel):
    module_id: str = Field(..., min_length=2, max_length=128)
    status: str = Field(..., pattern=r"^(PASS|FAIL|PENDING_SMOKE|HELD_POLICY|PARTIAL|DEMO_ONLY)$")
    smoke_sha: str | None = Field(None, max_length=64)
    notes: str | None = Field(None, max_length=2000)


class RollbackPromptIn(BaseModel):
    prompt_template_id: str = Field(..., min_length=2, max_length=64)
    to_version: str = Field(..., min_length=1, max_length=32)


@router.get("/status")
def get_status(db: Session = Depends(get_db), _user: User = Depends(get_current_user)) -> dict:
    return svc.compliance_status(db)


@router.get("/inventory")
def get_inventory(db: Session = Depends(get_db), _user: User = Depends(get_current_user)) -> dict:
    return svc.ai_inventory(db)


@router.get("/hard-live/evidence")
def get_hard_live(db: Session = Depends(get_db), _user: User = Depends(get_current_user)) -> dict:
    return svc.list_hard_live_evidence(db)


@router.post("/hard-live/evidence/mark")
def mark_hard_live(body: EvidenceMarkIn, db: Session = Depends(get_db), _user: User = Depends(get_current_user)) -> dict:
    try:
        return svc.mark_evidence_after_smoke(db, module_id=body.module_id, status=body.status, smoke_sha=body.smoke_sha, notes=body.notes)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc


@router.get("/security-review")
def get_security(_user: User = Depends(get_current_user)) -> dict:
    return svc.security_review()


@router.get("/bias-monitoring")
def get_bias(db: Session = Depends(get_db), _user: User = Depends(get_current_user)) -> dict:
    return svc.bias_monitoring_foundation(db)


@router.get("/observability")
def get_obs(db: Session = Depends(get_db), _user: User = Depends(get_current_user)) -> dict:
    return svc.observability_metrics(db)


@router.get("/claims")
def list_claims(db: Session = Depends(get_db), user: User = Depends(get_current_user), limit: int = Query(50, ge=1, le=200)) -> dict:
    return svc.list_claims_for_user(db, user, limit=limit)


@router.post("/claims", status_code=status.HTTP_201_CREATED)
def post_claim(body: ClaimCreateIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    try:
        return svc.create_claim(db, user=user, **body.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc


@router.get("/claims/{claim_id}")
def get_claim(claim_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user), tenant_id: int | None = None) -> dict:
    try:
        return svc.get_claim(db, claim_id, user=user, tenant_id=tenant_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc


@router.get("/claims/{claim_id}/history")
def get_history(claim_id: str, db: Session = Depends(get_db), _user: User = Depends(get_current_user)) -> dict:
    return svc.claim_history(db, claim_id)


@router.post("/claims/{claim_id}/transition")
def post_transition(claim_id: str, body: TransitionIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    try:
        return svc.transition_claim(db, user=user, claim_id=claim_id, **body.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc


@router.post("/claims/{claim_id}/supersede")
def post_supersede(claim_id: str, body: SupersedeIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    try:
        return svc.supersede_claim(db, user=user, claim_id=claim_id, new_value=body.new_value, reason_code=body.reason_code)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc


@router.post("/evidence", status_code=status.HTTP_201_CREATED)
def post_evidence(body: EvidenceCreateIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    try:
        return svc.create_evidence(db, user=user, **body.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc


@router.post("/evidence/link")
def post_link(body: LinkEvidenceIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    try:
        return svc.link_evidence(db, user=user, **body.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc


@router.post("/disputes", status_code=status.HTTP_201_CREATED)
def post_dispute(body: DisputeIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    try:
        return svc.raise_dispute(db, user=user, claim_id=body.claim_id, reason_code=body.reason_code, free_text=body.free_text, evidence_ids=body.evidence_ids)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc


@router.post("/disputes/{dispute_id}/resolve")
def post_resolve(dispute_id: str, body: ResolveDisputeIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    try:
        return svc.resolve_dispute(db, user=user, dispute_id=dispute_id, **body.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc


@router.post("/ai-runs", status_code=status.HTTP_201_CREATED)
def post_run(body: AiRunIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    try:
        return svc.record_ai_run(db, user=user, **body.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc


@router.post("/explanations", status_code=status.HTTP_201_CREATED)
def post_explanation(body: ExplanationIn, db: Session = Depends(get_db), _user: User = Depends(get_current_user)) -> dict:
    try:
        return svc.create_explanation(db, **body.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc


@router.post("/reviews", status_code=status.HTTP_201_CREATED)
def post_review(body: ReviewIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    try:
        return svc.human_review(db, user=user, **body.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc


@router.post("/guards/probe")
def post_guard(body: GuardProbeIn, db: Session = Depends(get_db), _user: User = Depends(get_current_user)) -> dict:
    try:
        if body.kind == "prohibited_use":
            svc.assert_not_prohibited(db, body.use_key or "social_scoring")
            return {"ok": True}
        if body.kind == "protected_attr":
            svc.assert_not_protected_inference(attribute=body.attribute, source=body.source)
            return {"ok": True}
        if body.kind == "prompt_injection":
            result = svc.scan_prompt_injection(body.text or "")
            if result["blocked"]:
                raise ValueError("prompt_injection_blocked")
            return {"ok": True, **result}
        if body.kind == "autonomous_employment":
            svc.assert_no_autonomous_employment(db, action=body.action or "auto_hire")
            return {"ok": True}
        raise ValueError("unknown_guard_kind")
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc


@router.post("/prompts/rollback")
def post_rollback(body: RollbackPromptIn, db: Session = Depends(get_db), _user: User = Depends(get_current_user)) -> dict:
    try:
        return svc.rollback_prompt_version(db, prompt_template_id=body.prompt_template_id, to_version=body.to_version)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc


@router.post("/smoke/assert-exclusion")
def post_smoke_exclusion(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    try:
        svc.assert_smoke_user_safe(user)
        return {"ok": True, "exclude_from_product_metrics": True, "outbound": False}
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
