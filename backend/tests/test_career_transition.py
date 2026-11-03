"""Career Transition & Outcome Learning — declared decision → impact loop; no workplace monitoring."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app.database.models import (
    Candidate,
    CandidateAcceptanceItem,
    CandidateCareerInboxItem,
    CandidateCareerOutcome,
    CandidateDecisionMemo,
    CandidateOfferRecord,
    CandidateTransitionAudit,
    CandidateTransitionCalibration,
    CandidateTransitionCheckin,
    CandidateTransitionMilestone,
    CandidateTransitionPrivacy,
    CandidateTransitionWorkspace,
    User,
)
from app.database.session import get_db
from app.main import create_app
from tests.test_auth_integration import _sqlite_session


def _setup(monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "career-transition-test-secret-32chars!")
    monkeypatch.setenv("MICROSOFT_CALENDAR_WRITE_ENABLED", "false")
    from app.config import get_settings
    from app.core.deps import get_current_user

    get_settings.cache_clear()
    db = _sqlite_session()
    bind = db.get_bind()
    tables = [
        User.__table__,
        Candidate.__table__,
        CandidateOfferRecord.__table__,
        CandidateDecisionMemo.__table__,
        CandidateCareerOutcome.__table__,
        CandidateTransitionWorkspace.__table__,
        CandidateTransitionCheckin.__table__,
        CandidateTransitionMilestone.__table__,
        CandidateTransitionCalibration.__table__,
        CandidateTransitionPrivacy.__table__,
        CandidateTransitionAudit.__table__,
        CandidateAcceptanceItem.__table__,
        CandidateCareerInboxItem.__table__,
    ]
    for table in tables:
        table.create(bind=bind, checkfirst=True)

    user = User(
        email="transition@example.com",
        hashed_password="x",
        gdpr_consent_at=datetime.now(timezone.utc),
        exclude_from_product_metrics=True,
    )
    db.add(user)
    db.flush()
    cand = Candidate(
        user_id=user.id,
        name="Transition Tester",
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
        email="transition@example.com"
    ).one()
    return db, cand, user, TestClient(app), app, get_settings


def _seed_declared_decision(db, cand_id: int, decision: str = "accept_intent", suffix: str = "tr"):
    offer = CandidateOfferRecord(
        candidate_id=cand_id,
        offer_key=f"off:{cand_id}:{suffix}",
        title="Backend Engineer",
        company="SynthCo",
        terms_json='{"base":"UNKNOWN"}',
        provenance="candidate_declared",
        claim_kind="CANDIDATE_CONFIRMED",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(offer)
    db.flush()
    memo = CandidateDecisionMemo(
        candidate_id=cand_id,
        offer_id=offer.id,
        memo_key=f"memo:{cand_id}:{suffix}",
        criteria_json="[]",
        memo_json="{}",
        declared_decision=decision,
        provenance="candidate_declared",
        external_action=False,
        claim_kind="CANDIDATE_CONFIRMED",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(memo)
    db.commit()
    db.refresh(memo)
    return offer, memo


def test_career_transition_decision_to_impact_loop(monkeypatch):
    db, cand, _user, client, app, get_settings = _setup(monkeypatch)
    try:
        offer, memo = _seed_declared_decision(db, cand.id, suffix="ok")

        # Reject inferred / non-declared path
        bad = client.post(
            "/api/v1/candidates/me/career-transition/workspaces",
            json={"decision_id": 99999},
        )
        assert bad.status_code in (400, 404)

        _hold_offer, hold_memo = _seed_declared_decision(db, cand.id, decision="hold", suffix="hold")
        rej = client.post(
            "/api/v1/candidates/me/career-transition/workspaces",
            json={"decision_id": hold_memo.id},
        )
        assert rej.status_code == 400
        detail = (rej.json().get("detail") or "").lower()
        assert "accept" in detail or "negotiate" in detail or "declared" in detail or "transition" in detail

        created = client.post(
            "/api/v1/candidates/me/career-transition/workspaces",
            json={"decision_id": memo.id, "title": "First 90"},
        )
        assert created.status_code == 201, created.text
        tr = created.json()["transition"]
        tid = tr["id"]
        assert tr["snapshots_immutable"] is True
        assert tr["plan_90_status"] == "AI_DRAFT"
        assert tr["resignation"]["external_send"] is False
        assert tr["workplace_monitoring"] is False
        assert all(s.get("sentiment") is None for s in tr["stakeholders"])
        assert all(not r.get("mental_health_inference") for r in tr["risks"])

        integ = client.get(
            f"/api/v1/candidates/me/career-transition/workspaces/{tid}/snapshot-integrity"
        )
        assert integ.status_code == 200
        assert integ.json()["immutable"] is True
        assert integ.json()["mutable"] is False

        # Snapshots not patchable
        snap_block = client.patch(
            f"/api/v1/candidates/me/career-transition/workspaces/{tid}/section",
            json={"section": "decision_snapshot", "value": {}},
        )
        assert snap_block.status_code == 400

        approve = client.post(
            f"/api/v1/candidates/me/career-transition/workspaces/{tid}/plan-90/approve",
            json={"approved": True},
        )
        assert approve.status_code == 200
        assert approve.json()["plan_90_status"] == "CANDIDATE_APPROVED"

        chk = client.post(
            f"/api/v1/candidates/me/career-transition/workspaces/{tid}/checkins",
            json={
                "period": "day_30",
                "facts": {"done": ["onboarding"]},
                "interpretation": {"note": "going well", "employer_confirmed": True},
            },
        )
        assert chk.status_code == 201
        body = chk.json()["checkin"]
        assert body["separated"] is True
        assert body["employer_confirmed"] is False
        assert body["interpretation"]["employer_confirmed"] is False
        assert body["provenance_facts"] == "candidate_reported"
        assert body["provenance_interpretation"] == "candidate_interpretation"

        detail = client.get(f"/api/v1/candidates/me/career-transition/workspaces/{tid}")
        assert detail.status_code == 200
        ms_id = detail.json()["milestones"][0]["id"]
        ev = client.post(
            f"/api/v1/candidates/me/career-transition/workspaces/{tid}/milestones/{ms_id}/evidence",
            json={"evidence_ids": [1]},
        )
        assert ev.status_code == 200
        assert ev.json()["mastery_inferred"] is False

        out = client.post(
            "/api/v1/candidates/me/career-transition/outcomes",
            json={
                "outcome_type": "ROLE_STARTED_DECLARED",
                "transition_id": tid,
                "prediction": {"text": "good fit", "claim_kind": "PREDICTION"},
            },
        )
        assert out.status_code == 201
        oid = out.json()["outcome"]["id"]
        cmp_ = client.get(
            f"/api/v1/candidates/me/career-transition/outcomes/{oid}/prediction-vs-outcome"
        )
        assert cmp_.status_code == 200
        assert cmp_.json()["hiring_certainty"] is None
        assert cmp_.json()["kpi_excluded"] is True

        cal = client.post(
            "/api/v1/candidates/me/career-transition/calibrate",
            json={"outcome_ids": [oid]},
        )
        assert cal.status_code == 201
        cid = cal.json()["calibration"]["id"]
        ver = cal.json()["calibration"]["version"]
        cal2 = client.post(
            "/api/v1/candidates/me/career-transition/calibrate",
            json={},
        )
        assert cal2.status_code == 201
        assert cal2.json()["calibration"]["version"] == ver + 1
        rev = client.post(
            f"/api/v1/candidates/me/career-transition/calibrate/{cid}/revert"
        )
        assert rev.status_code == 200
        assert rev.json()["calibration"]["reverted_from_id"] == cid

        graph = client.post(
            f"/api/v1/candidates/me/career-transition/workspaces/{tid}/graph/approve",
            json={"approved": True},
        )
        assert graph.status_code == 200
        assert graph.json()["candidate_approved"] is True

        for kind in ("application", "interview", "decision", "rejection"):
            r = client.post(
                f"/api/v1/candidates/me/career-transition/workspaces/{tid}/retrospective",
                json={"kind": kind, "body": {"note": "recollection only"}},
            )
            assert r.status_code == 200
            assert r.json()["retrospective"][kind]["employer_confirmed"] is False

        exp = client.get(
            f"/api/v1/candidates/me/career-transition/workspaces/{tid}/export"
        )
        assert exp.status_code == 200
        assert exp.json()["employer_notes_excluded"] is True
        assert exp.json()["secrets_excluded"] is True
        assert exp.json()["workplace_monitoring"] is False

        learn = client.get("/api/v1/candidates/me/career-transition/recommendation-learning")
        assert learn.status_code == 200
        assert learn.json()["deleted_excluded"] is True

        conf = client.get("/api/v1/candidates/me/career-transition/confidence-history")
        assert conf.status_code == 200
        assert conf.json()["hiring_certainty"] is None

        agg = client.get("/api/v1/candidates/me/career-transition")
        assert agg.status_code == 200
        assert agg.json()["alembic"] == "114_career_transition_outcome_learning"
        assert agg.json()["safety"]["workplace_monitoring"] is False
        assert agg.json()["safety"]["external_resignation"] is False
        assert agg.json()["safety"]["phase_3_career_agent"] == "NOT_STARTED"
        assert agg.json()["analytics"]["kpi_excluded"] is True

        deleted = client.post(
            f"/api/v1/candidates/me/career-transition/workspaces/{tid}/delete"
        )
        assert deleted.status_code == 200
        assert deleted.json()["outcomes_removed_from_recs"] is True
        learn2 = client.get("/api/v1/candidates/me/career-transition/recommendation-learning")
        types = [o["outcome_type"] for o in learn2.json()["outcomes"]]
        # soft-deleted transition outcomes excluded
        assert "ROLE_STARTED_DECLARED" not in types or all(
            o.get("transition_id") != tid for o in learn2.json()["outcomes"]
        )

        priv = client.patch(
            "/api/v1/candidates/me/career-transition/privacy",
            json={"learning_opt_in": True, "export_include_employer_notes": False},
        )
        assert priv.status_code == 200
        assert priv.json()["export_include_employer_notes"] is False
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()
