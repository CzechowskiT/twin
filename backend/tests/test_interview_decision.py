"""Interview & Decision Copilot — evidence-backed prep; no covert / external acts."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app.database.models import (
    Candidate,
    CandidateAcceptanceItem,
    CandidateCareerEvidence,
    CandidateDecisionMemo,
    CandidateInterviewAnswer,
    CandidateInterviewAudit,
    CandidateInterviewEvent,
    CandidateInterviewFeedback,
    CandidateInterviewMock,
    CandidateInterviewPrivacy,
    CandidateInterviewProcess,
    CandidateInterviewStage,
    CandidateOfferRecord,
    User,
)
from app.database.session import get_db
from app.main import create_app
from app.services import interview_decision as idc
from tests.test_auth_integration import _sqlite_session


def _setup(monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "interview-decision-test-secret-32chars!!")
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
        CandidateInterviewProcess.__table__,
        CandidateInterviewStage.__table__,
        CandidateInterviewAnswer.__table__,
        CandidateInterviewMock.__table__,
        CandidateInterviewEvent.__table__,
        CandidateInterviewFeedback.__table__,
        CandidateOfferRecord.__table__,
        CandidateDecisionMemo.__table__,
        CandidateInterviewPrivacy.__table__,
        CandidateInterviewAudit.__table__,
        CandidateAcceptanceItem.__table__,
    ]
    for table in tables:
        table.create(bind=bind, checkfirst=True)

    user = User(
        email="interview@example.com",
        hashed_password="x",
        gdpr_consent_at=datetime.now(timezone.utc),
        exclude_from_product_metrics=True,
    )
    db.add(user)
    db.flush()
    cand = Candidate(
        user_id=user.id,
        name="Interview Tester",
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
        email="interview@example.com"
    ).one()
    return db, cand, user, TestClient(app), app, get_settings


def _seed_evidence(db, cand_id: int) -> CandidateCareerEvidence:
    row = CandidateCareerEvidence(
        candidate_id=cand_id,
        evidence_key=f"ev:{cand_id}:idc",
        evidence_type="achievement",
        title="FastAPI delivery",
        summary="Built APIs with FastAPI",
        claim_kind="CANDIDATE_CONFIRMED",
        skills_json='["Python","FastAPI"]',
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


def test_process_answer_mock_offer_declare(monkeypatch):
    db, cand, user, client, app, get_settings = _setup(monkeypatch)
    try:
        ev = _seed_evidence(db, cand.id)
        res = client.post(
            "/api/v1/candidates/me/interview-decision/processes",
            json={"title": "Backend @ Synth", "company": "SynthCo", "role_title": "Backend Engineer"},
        )
        assert res.status_code == 201, res.text
        proc = res.json()["process"]
        assert proc["snapshot_immutable"] is True
        assert proc["covert_assistance"] is False
        assert any(h.get("likelihood") in {"LIKELY", "POSSIBLE", "UNLIKELY", "UNKNOWN"} for h in proc["hypotheses"])
        pid = proc["id"]

        integ = client.get(f"/api/v1/candidates/me/interview-decision/processes/{pid}/snapshot-integrity")
        assert integ.status_code == 200
        assert integ.json()["immutable"] is True
        assert integ.json()["mutable"] is False

        ans = client.post(
            f"/api/v1/candidates/me/interview-decision/processes/{pid}/answers",
            json={"question": "Tell me about a challenge", "evidence_ids": [ev.id], "likelihood": "LIKELY"},
        )
        assert ans.status_code == 201, ans.text
        body = ans.json()["answer"]
        assert body["fabricated"] is False
        assert body["audit"]["lineage_complete"] is True
        assert body["evidence_ids"] == [ev.id]

        assert (
            client.post(
                f"/api/v1/candidates/me/interview-decision/processes/{pid}/answers/approve",
                json={"answer_id": body["id"], "approved": True},
            ).status_code
            == 200
        )

        mock = client.post(f"/api/v1/candidates/me/interview-decision/processes/{pid}/mocks")
        assert mock.status_code == 201
        m = mock.json()["mock"]
        assert m["covert_assistance"] is False
        assert m["emotion_scoring"] is False
        assert m["personality_scoring"] is False
        assert m["assessment"]["hiring_probability"] is None

        fb = client.post(
            f"/api/v1/candidates/me/interview-decision/processes/{pid}/feedback",
            json={
                "employer_raw": {"text": "Positive signal"},
                "candidate_interpretation": {"text": "Maybe advancing"},
            },
        )
        assert fb.status_code == 201
        assert fb.json()["feedback"]["auto_creates_offer"] is False
        assert fb.json()["feedback"]["separated"] is True

        offer = client.post(
            "/api/v1/candidates/me/interview-decision/offers",
            json={
                "title": "Offer",
                "company": "SynthCo",
                "process_id": pid,
                "provenance": "candidate_declared",
                "terms": {"base": "UNKNOWN"},
            },
        )
        assert offer.status_code == 201
        assert offer.json()["offer"]["external_accept"] is False
        assert offer.json()["offer"]["external_negotiation"] is False

        memo = client.post(
            "/api/v1/candidates/me/interview-decision/memos",
            json={"process_id": pid, "offer_id": offer.json()["offer"]["id"]},
        )
        assert memo.status_code == 201
        mid = memo.json()["memo"]["id"]
        decl = client.post(
            f"/api/v1/candidates/me/interview-decision/memos/{mid}/declare",
            json={"decision": "hold", "notes": "Clarify UNKNOWN"},
        )
        assert decl.status_code == 200
        assert decl.json()["memo"]["external_action"] is False
        assert "candidate_declared" in decl.json()["memo"]["provenance"]

        agg = client.get("/api/v1/candidates/me/interview-decision")
        assert agg.status_code == 200
        assert agg.json()["alembic"] == "113_interview_decision_copilot"
        assert agg.json()["safety"]["covert_assistance"] is False
        assert agg.json()["safety"]["emotion_recognition"] is False
        assert agg.json()["safety"]["auto_create_offer_from_feedback"] is False
    finally:
        get_settings.cache_clear()
        app.dependency_overrides.clear()
        db.close()


def test_answer_requires_lineage(monkeypatch):
    db, cand, _user, client, app, get_settings = _setup(monkeypatch)
    try:
        res = client.post(
            "/api/v1/candidates/me/interview-decision/processes",
            json={"title": "X", "company": "Y", "role_title": "Z"},
        )
        pid = res.json()["process"]["id"]
        bad = client.post(
            f"/api/v1/candidates/me/interview-decision/processes/{pid}/answers",
            json={"question": "Q?", "evidence_ids": [999991]},
        )
        assert bad.status_code == 400
    finally:
        get_settings.cache_clear()
        app.dependency_overrides.clear()
        db.close()


def test_invalidated_evidence_blocks_approval(monkeypatch):
    db, cand, _user, _client, app, get_settings = _setup(monkeypatch)
    try:
        ev = _seed_evidence(db, cand.id)
        proc = idc.create_process(
            db,
            candidate_id=cand.id,
            title="Gate",
            company="C",
            role_title="Eng",
            is_synthetic=True,
        )
        ans = idc.build_answer(
            db,
            candidate_id=cand.id,
            process_id=proc.id,
            question="Challenge?",
            evidence_ids=[ev.id],
        )
        ev.deleted_at = datetime.utcnow()
        db.commit()
        try:
            idc.approve_answer(
                db, candidate_id=cand.id, process_id=proc.id, answer_id=ans.id, approved=True
            )
            assert False, "should block"
        except ValueError as exc:
            assert "invalidated_evidence" in str(exc)
    finally:
        get_settings.cache_clear()
        app.dependency_overrides.clear()
        db.close()


def test_offer_not_from_feedback_and_no_forbidden_external(monkeypatch):
    db, cand, _user, client, app, get_settings = _setup(monkeypatch)
    try:
        proc = idc.create_process(
            db, candidate_id=cand.id, title="O", company="C", role_title="R", is_synthetic=True
        )
        fb = idc.capture_feedback(
            db,
            candidate_id=cand.id,
            process_id=proc.id,
            employer_raw={"positive": True},
            candidate_interpretation={"maybe_offer": True},
        )
        assert fb.auto_creates_offer is False
        offers = (
            db.query(CandidateOfferRecord)
            .filter_by(candidate_id=cand.id, process_id=proc.id)
            .count()
        )
        assert offers == 0
        bad = client.post(
            "/api/v1/candidates/me/interview-decision/offers",
            json={"title": "X", "provenance": "auto_from_feedback", "terms": {}},
        )
        assert bad.status_code == 400
    finally:
        get_settings.cache_clear()
        app.dependency_overrides.clear()
        db.close()
