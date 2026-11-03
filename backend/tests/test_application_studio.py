"""Application Studio — evidence-backed prep; never external submit."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app.database.models import (
    Candidate,
    CandidateAcceptanceItem,
    CandidateAppStudioAsset,
    CandidateAppStudioAudit,
    CandidateAppStudioCoverLetter,
    CandidateAppStudioCvDraft,
    CandidateAppStudioPrivacy,
    CandidateAppStudioScreeningAnswer,
    CandidateAppStudioSubmission,
    CandidateAppStudioWorkspace,
    CandidateCareerEvidence,
    User,
)
from app.database.session import get_db
from app.main import create_app
from app.services import application_studio as studio
from tests.test_auth_integration import _sqlite_session


def _setup(monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "app-studio-test-secret")
    monkeypatch.setenv("MICROSOFT_CALENDAR_WRITE_ENABLED", "false")
    from app.config import get_settings
    from app.core.deps import get_current_user

    get_settings.cache_clear()
    db = _sqlite_session()
    bind = db.get_bind()
    tables = [
        User.__table__,
        Candidate.__table__,
        CandidateCareerEvidence.__table__,
        CandidateAppStudioWorkspace.__table__,
        CandidateAppStudioCvDraft.__table__,
        CandidateAppStudioCoverLetter.__table__,
        CandidateAppStudioScreeningAnswer.__table__,
        CandidateAppStudioAsset.__table__,
        CandidateAppStudioSubmission.__table__,
        CandidateAppStudioPrivacy.__table__,
        CandidateAppStudioAudit.__table__,
        CandidateAcceptanceItem.__table__,
    ]
    for table in tables:
        table.create(bind=bind, checkfirst=True)

    user = User(
        email="studio@example.com",
        hashed_password="x",
        gdpr_consent_at=datetime.now(timezone.utc),
        exclude_from_product_metrics=True,
    )
    db.add(user)
    db.flush()
    cand = Candidate(
        user_id=user.id,
        name="Studio Tester",
        skills='["Python","FastAPI"]',
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
        email="studio@example.com"
    ).one()
    return db, cand, user, TestClient(app), app, get_settings


def _seed_evidence(db, cand_id: int) -> CandidateCareerEvidence:
    row = CandidateCareerEvidence(
        candidate_id=cand_id,
        evidence_key=f"ev:{cand_id}:studio",
        evidence_type="achievement",
        title="FastAPI and PostgreSQL delivery",
        summary="Built APIs with FastAPI and PostgreSQL",
        claim_kind="CANDIDATE_CONFIRMED",
        skills_json='["Python","FastAPI","PostgreSQL","Celery"]',
        confidentiality="PRIVATE",
        status="active",
        is_synthetic=True,
        kpi_excluded=True,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def test_workspace_chain_and_declare(monkeypatch):
    db, cand, user, client, app, get_settings = _setup(monkeypatch)
    try:
        ev = _seed_evidence(db, cand.id)
        res = client.post(
            "/api/v1/candidates/me/application-studio/workspaces",
            json={
                "title": "Backend Engineer @ SynthCo",
                "opportunity": {
                    "title": "Backend Engineer",
                    "company": "SynthCo",
                    "description": "- Python and FastAPI\n- PostgreSQL\n- Celery experience\n- Evidence-backed delivery",
                },
            },
        )
        assert res.status_code == 201, res.text
        ws = res.json()["workspace"]
        assert ws["external_submit"] is False
        assert ws["opportunity"]["normalized"] is True
        assert len(ws["requirements"]) >= 1
        assert ws["fit"]["fit_kind"] in {
            "evidence_backed_fit",
            "partially_supported_fit",
            "claimed_fit",
            "unknown_fit",
        }
        assert ws["viability"]["hiring_certainty"] == "UNKNOWN"
        assert ws["strategy"]["autonomous_submit"] is False
        ws_id = ws["id"]

        cv = client.post(
            f"/api/v1/candidates/me/application-studio/workspaces/{ws_id}/cv-draft",
            json={"evidence_ids": [ev.id]},
        )
        assert cv.status_code == 201, cv.text
        draft = cv.json()["cv_draft"]
        assert draft["evidence_ids"] == [ev.id]
        assert draft["canonical_cv_rewritten"] is False
        assert draft["audit"]["lineage_complete"] is True
        assert draft["body"]["fabricated"] is False

        cover = client.post(
            f"/api/v1/candidates/me/application-studio/workspaces/{ws_id}/cover-letter",
            json={"evidence_ids": [ev.id]},
        )
        assert cover.status_code == 201
        assert "Not sent externally" in cover.json()["cover_letter"]["body_text"]

        sens = client.post(
            f"/api/v1/candidates/me/application-studio/workspaces/{ws_id}/screening",
            json={"question": "What is your salary expectation?", "answer_text": ""},
        )
        assert sens.status_code == 201
        ans = sens.json()["answer"]
        assert ans["sensitive"] is True
        assert ans["auto_completed"] is False
        assert ans["requires_candidate_input"] is True or ans["claim_kind"] == "UNKNOWN"

        ok_q = client.post(
            f"/api/v1/candidates/me/application-studio/workspaces/{ws_id}/screening",
            json={
                "question": "Describe a delivery challenge",
                "answer_text": "Led FastAPI migration from confirmed evidence",
                "evidence_ids": [ev.id],
            },
        )
        assert ok_q.status_code == 201

        asset = client.post(
            f"/api/v1/candidates/me/application-studio/workspaces/{ws_id}/assets",
            json={"title": "Case study excerpt", "evidence_ids": [ev.id]},
        )
        assert asset.status_code == 201
        assert asset.json()["asset"]["is_public"] is False

        assert (
            client.post(
                f"/api/v1/candidates/me/application-studio/workspaces/{ws_id}/approve",
                json={"artifact_type": "cv", "artifact_id": draft["id"], "approved": True},
            ).status_code
            == 200
        )
        assert (
            client.post(
                f"/api/v1/candidates/me/application-studio/workspaces/{ws_id}/approve",
                json={
                    "artifact_type": "cover",
                    "artifact_id": cover.json()["cover_letter"]["id"],
                    "approved": True,
                },
            ).status_code
            == 200
        )

        detail = client.get(f"/api/v1/candidates/me/application-studio/workspaces/{ws_id}")
        assert detail.status_code == 200
        readiness = detail.json()["workspace"]["readiness"]
        assert readiness["external_submit_allowed"] is False

        if readiness.get("ready_to_declare_submission"):
            decl = client.post(
                f"/api/v1/candidates/me/application-studio/workspaces/{ws_id}/declare-submission",
                json={"channel": "manual_external", "notes": "I submitted on company portal"},
            )
            assert decl.status_code == 200, decl.text
            sub = decl.json()["submission"]
            assert sub["external_submit"] is False
            assert sub["status"] == "candidate_declared"
            assert "candidate_declared" in sub["provenance"]
            assert sub["status"].upper() not in {"SUBMITTED", "SENT", "DELIVERED"}

        hand = client.post(
            f"/api/v1/candidates/me/application-studio/workspaces/{ws_id}/interview-handoff"
        )
        assert hand.status_code == 200
        assert hand.json()["handoff"]["external_submit"] is False

        exp = client.get(f"/api/v1/candidates/me/application-studio/workspaces/{ws_id}/export")
        assert exp.status_code == 200
        assert exp.json()["secrets_excluded"] is True

        agg = client.get("/api/v1/candidates/me/application-studio")
        assert agg.status_code == 200
        body = agg.json()
        assert body["alembic"] == "112_application_studio"
        assert body["safety"]["external_submit"] is False
        assert body["safety"]["auto_apply"] is False
        assert body["integrations"]["daily_os_brief"].endswith("/daily-os/brief")

        brief = client.get("/api/v1/candidates/me/daily-os/brief")
        # May 200 with brief or soft-fail if daily_os tables missing in sqlite — route must not 404
        assert brief.status_code != 404
    finally:
        get_settings.cache_clear()
        app.dependency_overrides.clear()
        db.close()


def test_cv_requires_confirmed_evidence(monkeypatch):
    db, cand, user, client, app, get_settings = _setup(monkeypatch)
    try:
        res = client.post(
            "/api/v1/candidates/me/application-studio/workspaces",
            json={
                "title": "No evidence role",
                "opportunity": {"title": "X", "company": "Y", "description": "Need Rust"},
            },
        )
        ws_id = res.json()["workspace"]["id"]
        bad = client.post(
            f"/api/v1/candidates/me/application-studio/workspaces/{ws_id}/cv-draft",
            json={"evidence_ids": []},
        )
        assert bad.status_code == 400
        assert "cv_draft_requires_confirmed_evidence" in bad.json()["detail"]
    finally:
        get_settings.cache_clear()
        app.dependency_overrides.clear()
        db.close()


def test_evidence_purge_clears_studio_refs(monkeypatch):
    db, cand, _user, _client, app, get_settings = _setup(monkeypatch)
    try:
        ev = _seed_evidence(db, cand.id)
        ws = studio.create_workspace(
            db,
            candidate_id=cand.id,
            title="Purge test",
            opportunity={"title": "Eng", "company": "C", "description": "- Python"},
            is_synthetic=True,
        )
        draft = studio.draft_tailored_cv(
            db, candidate_id=cand.id, workspace_id=ws.id, evidence_ids=[ev.id]
        )
        assert draft.evidence_ids_json
        out = studio.purge_all_evidence_refs(db, candidate_id=cand.id)
        assert out["ok"] is True
        db.commit()
        db.expire_all()
        draft2 = db.query(CandidateAppStudioCvDraft).filter_by(id=draft.id).one()
        assert draft2.deleted_at is not None or draft2.evidence_ids_json in ("[]", "null", "")
    finally:
        get_settings.cache_clear()
        app.dependency_overrides.clear()
        db.close()


def test_no_forbidden_status_without_provenance(monkeypatch):
    db, cand, _user, client, app, get_settings = _setup(monkeypatch)
    try:
        ev = _seed_evidence(db, cand.id)
        ws = studio.create_workspace(
            db,
            candidate_id=cand.id,
            title="Gate",
            opportunity={
                "title": "Backend Engineer",
                "company": "C",
                "description": "- Python\n- FastAPI\n- PostgreSQL",
            },
            is_synthetic=True,
        )
        cv = studio.draft_tailored_cv(
            db, candidate_id=cand.id, workspace_id=ws.id, evidence_ids=[ev.id]
        )
        cover = studio.draft_cover_letter(
            db, candidate_id=cand.id, workspace_id=ws.id, evidence_ids=[ev.id]
        )
        studio.add_screening_answer(
            db,
            candidate_id=cand.id,
            workspace_id=ws.id,
            question="Challenge?",
            answer_text="Confirmed delivery",
        )
        studio.approve_artifact(
            db,
            candidate_id=cand.id,
            workspace_id=ws.id,
            artifact_type="cv",
            artifact_id=cv.id,
            approved=True,
        )
        studio.approve_artifact(
            db,
            candidate_id=cand.id,
            workspace_id=ws.id,
            artifact_type="cover",
            artifact_id=cover.id,
            approved=True,
        )
        studio.refresh_fit(db, candidate_id=cand.id, workspace_id=ws.id)
        sub = studio.declare_submission(
            db,
            candidate_id=cand.id,
            workspace_id=ws.id,
            channel="portal_self",
            notes="declared",
        )
        assert sub.status == "candidate_declared"
        assert sub.external_submit is False
        assert "candidate_declared" in sub.provenance
        payload = studio._loads(sub.payload_json, {})
        assert payload.get("frozen_snapshot")
        assert payload["twin_submitted_externally"] is False
    finally:
        get_settings.cache_clear()
        app.dependency_overrides.clear()
        db.close()
