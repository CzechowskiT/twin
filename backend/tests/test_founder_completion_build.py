"""Founder completion BUILD — ATS dry-run, enrollment capability, calendar holds."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.deps import get_db
from app.database.models import AtsSyncAttempt, Base, FeatureFlagState
from app.main import app
from app.services import ai_external_verification as ext
from app.services import ats_sync_service as ats
from app.services import company_calendar_service as cal
from app.services import platform_foundations as foundations


@pytest.fixture()
def db() -> Iterator[Session]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def client(db: Session) -> Iterator[TestClient]:
    def override_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_db
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_ats_dry_run_and_live_blocked(db: Session) -> None:
    result = ats.enqueue_ats_write_dry_run(
        db, company_slug="nova-hiring-pl", application_id=1, provider="greenhouse"
    )
    assert result["dry_run"] is True
    assert result["ats_write"] is False
    assert result["evidence_table"] == "ats_sync_attempts"
    assert db.query(AtsSyncAttempt).count() >= 1
    lever = ats.enqueue_ats_write_dry_run(
        db, company_slug="nova-hiring-pl", application_id=2, provider="lever"
    )
    assert lever["provider"] == "lever"
    assert lever["provider_payload"]["dry_run"] is True
    evidence = ats.list_sync_attempts(db, company_slug="nova-hiring-pl")
    assert evidence["module_id"] == "investor_sor_proof_ats"
    assert evidence["total"] >= 2
    with pytest.raises(ValueError, match="blocked"):
        ats.enqueue_ats_write(
            db, company_slug="nova-hiring-pl", application_id=1, provider="greenhouse", live=True
        )


def test_vacancy_preview_honest_without_oauth(db: Session) -> None:
    empty = ats.honest_empty_preview(db, provider="greenhouse", reason="NEEDS_OAUTH")
    assert empty["jobs"] == []
    assert empty["source"] == "honesty"
    assert empty["writeback"] is False
    preview = ats.list_vacancy_import_preview(db, user_id=999, provider="lever")
    assert preview["vacancy_import"] == "NEEDS_OAUTH"
    assert preview["jobs"] == []


def test_company_calendar_hold_draft(db: Session) -> None:
    start = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=1)
    end = start + timedelta(hours=1)
    out = cal.create_hold_draft(
        db,
        company_slug="nova-hiring-pl",
        title="HM screen",
        starts_at=start,
        ends_at=end,
        provider="local",
    )
    assert out["status"] == "draft"
    listed = cal.list_holds(db, company_slug="nova-hiring-pl")
    assert listed["holds"]


def test_external_verification_respects_flag(db: Session) -> None:
    row = FeatureFlagState(
        flag_key="AI_EXTERNAL_VERIFICATION_ENABLED",
        enabled=False,
        notes="test",
    )
    db.add(row)
    db.commit()
    with pytest.raises(ValueError, match="off"):
        ext.verify_claim_external(db, claim_id=1)
    row.enabled = True
    db.commit()
    out = ext.verify_claim_external(db, claim_id=42)
    assert out["human_review_required"] is True
    assert out["autonomous_employment"] is False


def test_enrollment_capability_kill_switch_off(client: TestClient) -> None:
    res = client.get("/api/v1/platform/foundations/enrollment/capability")
    assert res.status_code == 200
    body = res.json()
    assert body["external_pilot_enrollment_enabled"] is False
    assert body["capability_ready"] is True
    assert body["launch_stance"] == "OFF"
    assert body["real_invites"] is False


def test_ats_status_endpoint(client: TestClient) -> None:
    res = client.get("/api/v1/integrations/ats/status")
    assert res.status_code == 200
    body = res.json()
    assert "vacancy_import" in body
    assert body["ats_live_sync"] in {"BLOCKED", "LIVE"}
    assert "greenhouse" in body.get("supported_providers", [])
    assert "lever" in body.get("supported_providers", [])


def test_ats_preview_and_attempts_endpoints(client: TestClient, db: Session) -> None:
    preview = client.get("/api/v1/integrations/ats/vacancies/preview?provider=lever")
    assert preview.status_code == 200
    pbody = preview.json()
    assert pbody["jobs"] == []
    assert pbody["vacancy_import"] == "NEEDS_OAUTH"
    dry = client.post(
        "/api/v1/integrations/ats/sync/dry-run",
        json={"company_slug": "nova-hiring-pl", "application_id": 9, "provider": "lever"},
    )
    assert dry.status_code == 201
    attempts = client.get("/api/v1/integrations/ats/sync/attempts?company_slug=nova-hiring-pl")
    assert attempts.status_code == 200
    abody = attempts.json()
    assert abody["table"] == "ats_sync_attempts"
    assert abody["total"] >= 1
    assert db.query(AtsSyncAttempt).count() >= 1


def test_foundations_enrollment_helper(db: Session) -> None:
    assert foundations.is_external_pilot_enrollment_enabled(db) is False


def test_company_stripe_sandbox_stub_without_keys() -> None:
    from app.config import Settings
    from app.services.company_stripe_sandbox import create_company_sandbox_checkout

    settings = Settings(stripe_secret_key="")
    out = create_company_sandbox_checkout(
        settings, company_slug="nova-hiring-pl", plan_sku="company_pilot", account_id=1
    )
    assert out["stripe_mode"] == "sandbox_stub"
    assert out["session_id"] is None
    assert out["public_launch"] is False
    assert out["stripe_not_public_launch"] is True


def test_truthful_claims_forbid_certified_pass() -> None:
    from app.services.truthful_claims import assert_certification_not_claimable, truthful_claims_honesty

    with pytest.raises(ValueError, match="certification_claim_forbidden"):
        assert_certification_not_claimable("ai_act_certified_claim", status="PASS")
    with pytest.raises(ValueError, match="certification_claim_forbidden"):
        assert_certification_not_claimable("ai_protected_attr_monitoring", status="PASS")
    assert_certification_not_claimable("ai_decision_log", status="PASS")
    honesty = truthful_claims_honesty()
    assert honesty["ai_act_certified"] is False
    assert honesty["protected_attr_monitoring_legal_gate_open"] is False
    assert honesty["ai_act_tech_control_coverage_ready"] is True
    assert honesty["protected_attr_monitoring_tech_ready"] is True
    assert honesty["stance"] == "TECH_READY_NO_CLAIM"
    assert honesty["registry_pass_forbidden"] is True


def test_company_stripe_sandbox_uses_company_pilot_price_env() -> None:
    from app.config import Settings
    from app.services.company_stripe_sandbox import create_company_sandbox_checkout

    settings = Settings(stripe_secret_key="sk_test_x", stripe_price_id_company_pilot="")
    out = create_company_sandbox_checkout(
        settings, company_slug="nova-hiring-pl", plan_sku="company_pilot", account_id=1
    )
    assert out["public_launch"] is False
    assert out["sandbox_ready"] is False
    assert out["reason"] == "company_price_id_missing"
    assert out["price_env"] == "STRIPE_PRICE_ID_COMPANY_PILOT"

def test_hitl_employment_recommendation(db: Session) -> None:
    from app.database.models import User
    from app.services import ai_compliance as compliance
    from app.services import ai_employment_hitl as hitl

    user = User(email="hitl@test.com", hashed_password="x", is_active=True)
    db.add(user)
    db.commit()
    db.refresh(user)
    compliance.seed_flags_registry_and_evidence(db)
    out = hitl.recommend_employment_action(
        db,
        user=user,
        subject_id="cand-1",
        recommendation_kind="match_fit_advisory",
        rationale="Advisory only — human must approve.",
        confidence=0.5,
    )
    assert out["autonomous_employment"] is False
    assert out["human_approval_required"] is True
    assert out["binding"] is False
    with pytest.raises(ValueError, match="invalid_recommendation_kind"):
        hitl.recommend_employment_action(
            db,
            user=user,
            subject_id="cand-1",
            recommendation_kind="auto_hire",
            rationale="forbidden",
        )
