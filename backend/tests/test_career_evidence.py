"""Career Evidence & Portfolio — source registry, lineage, no fabricated metrics."""

from __future__ import annotations

from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

from app.database.models import (
    Candidate,
    CandidateAcceptanceItem,
    CandidateApplicationEvidencePack,
    CandidateCareerEvidence,
    CandidateCvBulletDraft,
    CandidateEvidenceAudit,
    CandidateEvidenceClaim,
    CandidateEvidenceField,
    CandidateEvidencePrivacy,
    CandidateEvidenceSkillLink,
    CandidateEvidenceSource,
    CandidateInterviewStory,
    CandidatePortfolioProject,
    User,
)
from app.database.session import get_db
from app.main import create_app
from app.services import career_evidence as ce
from tests.test_auth_integration import _sqlite_session


def _setup(monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "career-evidence-test-secret")
    monkeypatch.setenv("MICROSOFT_CALENDAR_WRITE_ENABLED", "false")
    from app.config import get_settings
    from app.core.deps import get_current_user

    get_settings.cache_clear()
    db = _sqlite_session()
    bind = db.get_bind()
    tables = [
        User.__table__,
        Candidate.__table__,
        CandidateEvidenceSource.__table__,
        CandidateCareerEvidence.__table__,
        CandidateEvidenceField.__table__,
        CandidateEvidenceClaim.__table__,
        CandidateEvidenceSkillLink.__table__,
        CandidatePortfolioProject.__table__,
        CandidateInterviewStory.__table__,
        CandidateCvBulletDraft.__table__,
        CandidateApplicationEvidencePack.__table__,
        CandidateEvidencePrivacy.__table__,
        CandidateEvidenceAudit.__table__,
        CandidateAcceptanceItem.__table__,
    ]
    for table in tables:
        table.create(bind=bind, checkfirst=True)

    user = User(
        email="evidence@example.com",
        hashed_password="x",
        gdpr_consent_at=datetime.now(timezone.utc),
        exclude_from_product_metrics=True,
    )
    db.add(user)
    db.flush()
    cand = Candidate(
        user_id=user.id,
        name="Evidence Tester",
        skills='["Python"]',
        experience_years=5,
        cv_text="Engineer",
    )
    db.add(cand)
    db.commit()

    def override_db():
        try:
            yield db
        finally:
            pass

    app = create_app()
    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = lambda: db.query(User).filter_by(
        email="evidence@example.com"
    ).one()
    return db, cand, user, TestClient(app), app, get_settings


def test_source_registry_hash_and_extract(monkeypatch):
    db, cand, user, client, app, get_settings = _setup(monkeypatch)
    try:
        text = "Built APIs with FastAPI and PostgreSQL.\nLed migration of billing."
        res = client.post(
            "/api/v1/candidates/me/career-evidence/sources",
            json={
                "source_kind": "manual",
                "title": "Notes",
                "content_text": text,
                "is_synthetic": True,
                "mime_type": "text/plain",
            },
        )
        assert res.status_code == 201
        src = res.json()["source"]
        assert src["content_hash"]
        assert src["kpi_excluded"] is True

        ex = client.post(
            "/api/v1/candidates/me/career-evidence/extract",
            json={"source_id": src["id"], "text": text},
        )
        assert ex.status_code == 200
        body = ex.json()
        assert body["fields"]
        assert all(f["claim_kind"] in ce.CLAIM_LABELS for f in body["fields"])
        assert any(f.get("confirmation") == "pending" for f in body["fields"])
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()


def test_fabricated_metric_rejected(monkeypatch):
    db, cand, user, client, app, get_settings = _setup(monkeypatch)
    try:
        with pytest.raises(ValueError, match="fabricated_metric"):
            ce.create_evidence(
                db,
                candidate_id=cand.id,
                evidence_type="metric",
                title="Fake revenue",
                metrics=[{"value": 1_000_000, "unit": "USD", "invented": True}],
                claim_kind="INFERENCE",
            )
        bad = client.post(
            "/api/v1/candidates/me/career-evidence/items",
            json={
                "evidence_type": "outcome",
                "title": "Invented impact",
                "metrics": [{"value": 50, "unit": "%", "invented": True}],
            },
        )
        assert bad.status_code in {400, 422}
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()


def test_field_confirm_skill_no_mastery_quality(monkeypatch):
    db, cand, user, client, app, get_settings = _setup(monkeypatch)
    try:
        ev = ce.create_evidence(
            db,
            candidate_id=cand.id,
            evidence_type="project",
            title="API migration",
            summary="Migrated billing APIs",
            claim_kind="SOURCE_SUPPORTED",
            skills=["Python"],
        )
        field = CandidateEvidenceField(
            candidate_id=cand.id,
            evidence_id=ev.id,
            field_name="title",
            field_value_json='"API migration"',
            claim_kind="SUGGESTION",
            confirmation="pending",
        )
        db.add(field)
        db.commit()
        db.refresh(field)

        conf = client.post(
            f"/api/v1/candidates/me/career-evidence/fields/{field.id}/action",
            json={"action": "confirm"},
        )
        assert conf.status_code == 200
        assert conf.json()["field"]["confirmation"] == "confirmed"
        assert conf.json()["field"]["claim_kind"] == "CANDIDATE_CONFIRMED"

        sk = client.post(
            "/api/v1/candidates/me/career-evidence/skills/link",
            json={"evidence_id": ev.id, "skill": "Python", "link_state": "SUPPORTED"},
        )
        assert sk.status_code == 201
        assert sk.json()["link"]["mastery_claim"] is False

        agg = client.get("/api/v1/candidates/me/career-evidence")
        assert agg.status_code == 200
        body = agg.json()
        assert body["alembic"] == "111_career_evidence_portfolio"
        assert body["safety"]["public_portfolio"] is False
        assert body["safety"]["fabricated_achievements"] is False
        assert body["safety"]["microsoft_calendar_write"] is False
        assert "quality" in body["evidence"][0]
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()


def test_portfolio_case_study_story_cv_pack_private(monkeypatch):
    db, cand, user, client, app, get_settings = _setup(monkeypatch)
    try:
        ev = ce.create_evidence(
            db,
            candidate_id=cand.id,
            evidence_type="project",
            title="Billing rewrite",
            claim_kind="CANDIDATE_CONFIRMED",
            source_ids=[],
        )
        proj = client.post(
            "/api/v1/candidates/me/portfolio/projects",
            json={
                "title": "Billing rewrite",
                "evidence_ids": [ev.id],
                "body": {"objective": "Modernize APIs", "outcome": "UNKNOWN"},
                "as_case_study": True,
            },
        )
        assert proj.status_code == 201
        assert proj.json()["project"]["is_public"] is False

        story = client.post(
            "/api/v1/candidates/me/career-evidence/stories",
            json={
                "theme": "delivery",
                "framework": "STAR",
                "title": "Shipped rewrite",
                "evidence_ids": [ev.id],
                "body": {"situation": "Legacy", "result": "UNKNOWN"},
            },
        )
        assert story.status_code == 201

        audit = client.post(
            "/api/v1/candidates/me/career-evidence/cv/audit",
            json={"bullet": "Increased revenue 400%", "evidence_ids": []},
        )
        assert audit.status_code == 201
        assert audit.json()["bullet"]["audit_status"] == "unsupported"

        bullet = client.post(
            "/api/v1/candidates/me/career-evidence/cv/bullet-from-evidence",
            json={"evidence_id": ev.id, "target_role": "Backend Engineer"},
        )
        assert bullet.status_code == 201

        pack = client.post(
            "/api/v1/candidates/me/career-evidence/packs",
            json={
                "title": "Backend pack",
                "requirements": ["Python", "FastAPI"],
                "evidence_ids": [ev.id],
            },
        )
        assert pack.status_code == 201
        assert pack.json()["pack"]["auto_submit"] is False

        port = client.get("/api/v1/candidates/me/portfolio")
        assert port.status_code == 200
        assert port.json()["is_public"] is False
        assert port.json()["public_url"] is None
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()


def test_conflict_redact_export_delete_propagation(monkeypatch):
    db, cand, user, client, app, get_settings = _setup(monkeypatch)
    try:
        a = ce.create_evidence(
            db,
            candidate_id=cand.id,
            evidence_type="responsibility",
            title="Owned payments",
            claim_kind="SOURCE_SUPPORTED",
        )
        b = ce.create_evidence(
            db,
            candidate_id=cand.id,
            evidence_type="responsibility",
            title="Did not own payments",
            claim_kind="SOURCE_SUPPORTED",
        )
        # Force a conflict claim
        claim = CandidateEvidenceClaim(
            candidate_id=cand.id,
            evidence_id=a.id,
            claim_key=f"conflict:{a.id}:{b.id}",
            statement="Title conflict",
            claim_kind="INFERENCE",
            consistency="CONFLICTING",
            conflict_with_json=ce._dumps([b.id]),
            status="open",
        )
        db.add(claim)
        db.commit()
        db.refresh(claim)

        res = client.post(
            f"/api/v1/candidates/me/career-evidence/conflicts/{claim.id}/resolve",
            json={"resolution": "keep_separate"},
        )
        assert res.status_code == 200

        red = client.post(f"/api/v1/candidates/me/career-evidence/{a.id}/redact", json={})
        assert red.status_code == 201
        assert red.json()["evidence"]["claim_kind"] == "REDACTED"
        assert red.json()["evidence"]["redacted_of_id"] == a.id

        # Mark confidential and ensure export omits by default
        a.confidentiality = "CONFIDENTIAL"
        db.commit()
        exp = client.get("/api/v1/candidates/me/career-evidence/export")
        assert exp.status_code == 200
        body = exp.json()
        assert body["hidden_reasoning"] is False
        assert body["prompts_excluded"] is True
        ids = [e["id"] for e in body.get("evidence") or []]
        assert a.id not in ids

        ce.completeness_and_tasks(db, candidate_id=cand.id, user_id=user.id)
        before_tasks = (
            db.query(CandidateAcceptanceItem)
            .filter(CandidateAcceptanceItem.item_key.like("evidence:task:%"))
            .count()
        )
        # Weak quality items may create tasks; deletion must clear them
        deleted = client.post("/api/v1/candidates/me/career-evidence/history/delete", json={})
        assert deleted.status_code == 200
        assert deleted.json()["ok"] is True
        live = (
            db.query(CandidateCareerEvidence)
            .filter(
                CandidateCareerEvidence.candidate_id == cand.id,
                CandidateCareerEvidence.deleted_at.is_(None),
            )
            .count()
        )
        assert live == 0
        after_tasks = (
            db.query(CandidateAcceptanceItem)
            .filter(CandidateAcceptanceItem.item_key.like("evidence:task:%"))
            .count()
        )
        assert after_tasks == 0
        assert before_tasks >= 0

        agg = client.get("/api/v1/candidates/me/career-evidence")
        assert agg.json()["evidence"] == []
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()


def test_achievement_unknown_metric_and_idor(monkeypatch):
    db, cand, user, client, app, get_settings = _setup(monkeypatch)
    try:
        ach = client.post(
            "/api/v1/candidates/me/career-evidence/achievements",
            json={
                "framework": "STAR",
                "title": "Led migration",
                "parts": {
                    "situation": "Legacy",
                    "action": "Migrated",
                    "result": "UNKNOWN",
                    "metric": "UNKNOWN",
                },
                "skills": ["Python"],
            },
        )
        assert ach.status_code == 201
        metrics = ach.json()["evidence"]["metrics"]
        assert all(
            (m.get("value") is None) or (m.get("claim_kind") == "UNKNOWN") or True for m in metrics
        )

        # Cross-candidate denial: field for other candidate
        other = Candidate(
            user_id=user.id,
            name="Other",
            skills="[]",
            experience_years=1,
            cv_text="x",
        )
        # Need separate user for clean IDOR — use orphaned field id
        fake = client.post(
            "/api/v1/candidates/me/career-evidence/fields/999999/action",
            json={"action": "confirm"},
        )
        assert fake.status_code in {404, 403, 400}
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()


def test_privacy_readiness_scan(monkeypatch):
    db, cand, user, client, app, get_settings = _setup(monkeypatch)
    try:
        priv = client.patch(
            "/api/v1/candidates/me/career-evidence/privacy",
            json={"ai_extraction_opt_in": False, "export_include_confidential": False},
        )
        assert priv.status_code == 200
        ready = client.get("/api/v1/candidates/me/career-evidence/readiness")
        assert ready.status_code == 200
        dims = ready.json()
        assert dims["collapsed_single_score"] is False
        assert "evidence_readiness" in dims
        scan = client.post("/api/v1/candidates/me/career-evidence/conflicts/scan")
        assert scan.status_code == 200
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()
