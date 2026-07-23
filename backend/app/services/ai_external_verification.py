"""AI external verification — sandbox provider; no autonomous employment."""

from __future__ import annotations

import json
import secrets
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import CareerClaimExternalVerification, FeatureFlagState
from app.services.platform_foundations import record_domain_event


def is_external_verification_enabled(db: Session) -> bool:
    row = (
        db.query(FeatureFlagState)
        .filter(FeatureFlagState.flag_key == "AI_EXTERNAL_VERIFICATION_ENABLED")
        .one_or_none()
    )
    return bool(row and row.enabled)


def verify_claim_external(
    db: Session,
    *,
    claim_id: int,
    provider: str = "twin_sandbox_verifier",
) -> dict[str, Any]:
    """Run external verification against sandbox provider.

    Real third-party providers plug in here. Sandbox always returns inconclusive
    unless flag enabled — then returns verified_sandbox with audit trail.
    Never transitions employment decisions autonomously.
    """
    if not is_external_verification_enabled(db):
        raise ValueError("external_verification_off")
    request_id = f"ext-{secrets.token_hex(8)}"
    result = {
        "verdict": "verified_sandbox",
        "confidence": 0.42,
        "provider": provider,
        "human_review_required": True,
        "autonomous_employment": False,
    }
    row = CareerClaimExternalVerification(
        claim_id=claim_id,
        provider=(provider or "twin_sandbox_verifier")[:64],
        request_id=request_id,
        result_status="verified_sandbox",
        result_json=json.dumps(result),
        created_at=datetime.now(timezone.utc),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    record_domain_event(
        db,
        event_name="ai.external_verification",
        aggregate_type="career_claim",
        aggregate_id=str(claim_id),
        payload={
            "verification_id": row.id,
            "request_id": request_id,
            "result_status": row.result_status,
            "human_review_required": True,
        },
    )
    return {
        "verification_id": row.id,
        "claim_id": claim_id,
        "request_id": request_id,
        "result_status": row.result_status,
        "human_review_required": True,
        "autonomous_employment": False,
        "provider": row.provider,
    }
