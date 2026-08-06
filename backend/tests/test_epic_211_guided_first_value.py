"""Epic 2.11 — guided first value, isolated demo, discoverability unit tests."""

from __future__ import annotations

from app.database.models import (
    Candidate,
    CandidateGuidedFirstValue,
    CandidateIsolatedDemoSession,
    User,
)
from app.services import capability_discoverability as discover
from app.services import guided_first_value as gfv
from app.services import isolated_demo as demo
from app.services import pilot_metric_contracts as metrics
from tests.test_auth_integration import _sqlite_session


def _db():
    db = _sqlite_session()
    bind = db.get_bind()
    for table in (
        User.__table__,
        Candidate.__table__,
        CandidateGuidedFirstValue.__table__,
        CandidateIsolatedDemoSession.__table__,
    ):
        table.create(bind=bind, checkfirst=True)
    user = User(
        email="epic211@example.com",
        hashed_password="x",
        gdpr_consent_at=__import__("datetime").datetime.utcnow(),
        exclude_from_product_metrics=True,
    )
    db.add(user)
    db.flush()
    cand = Candidate(user_id=user.id, name="Epic211", skills="[]", experience_years=1)
    db.add(cand)
    db.commit()
    db.refresh(user)
    db.refresh(cand)
    return db, user, cand


def test_guided_entry_and_starter_idempotent():
    db, user, cand = _db()
    try:
        st = gfv.get_status(db, candidate_id=cand.id, user_id=user.id)
        assert st["state"] == "NOT_STARTED"
        assert st["first_value_contract"] == "pilot_first_value_v1"
        out = gfv.choose_entry(db, candidate_id=cand.id, user_id=user.id, choice="START_WITH_MY_DATA")
        assert out["ok"] is True
        path = gfv.select_starter_path(db, candidate_id=cand.id, user_id=user.id, path="direction")
        assert path["ok"] is True
        assert path["meta"]["requires_cv"] is False
        again = gfv.select_starter_path(db, candidate_id=cand.id, user_id=user.id, path="direction")
        assert again["ok"] is True
        paused = gfv.pause(db, candidate_id=cand.id, user_id=user.id)
        assert paused["state"] == "PAUSED"
        resumed = gfv.resume(db, candidate_id=cand.id, user_id=user.id)
        assert resumed["state"] == "IN_PROGRESS"
        skipped = gfv.skip(db, candidate_id=cand.id, user_id=user.id)
        assert skipped["state"] == "SKIPPED"
    finally:
        db.close()


def test_demo_does_not_set_real_first_value():
    db, user, cand = _db()
    try:
        started = demo.start_session(db, candidate_id=cand.id, user_id=user.id)
        assert started["mode"] == "DEMO"
        assert started["kpi_excluded"] is True
        assert started["canonical_writes"] == 0
        assert started["promote_to_real"] is False
        assert "SIMULATED" in (started["scenario"]["persona"]["label"] or "")
        seen = gfv.mark_demo_first_value_seen(db, candidate_id=cand.id, user_id=user.id)
        assert seen["demo_first_value_seen"] is True
        assert seen["real_first_value_reached"] is False
        cont = demo.contamination_report(db, candidate_id=cand.id)
        assert cont["passed"] is True
        assert cont["canonical_writes"] == 0
        assert cont["kpi_contamination"] == 0
        exited = demo.exit_to_my_data(db, candidate_id=cand.id, user_id=user.id)
        assert exited["demo_mode"] is False
        assert demo.get_session(db, candidate_id=cand.id)["active"] is False
    finally:
        db.close()


def test_discoverability_seven_areas_no_eighth():
    reg = discover.discoverability_registry()
    assert reg["primary_count"] == 7
    assert reg["eighth_nav_item"] is False
    assert reg["silent_personalization_scores"] is False
    assert reg["public_preview"]["status"] == "READY_INACTIVE"
    assert reg["public_preview"]["enabled_in_production"] is False
    assert len(reg["tour"]["steps"]) == 7
    assert reg["tour"]["equals_first_value"] is False
    empty = discover.empty_state_contract()
    assert empty["complete_count"] == empty["expected_count"]
    assert empty["loading_equals_empty"] is False
    assert empty["error_equals_empty"] is False


def test_metric_contracts_include_211():
    ids = {c["id"] for c in metrics.metric_contracts()}
    assert "starter_path" in ids
    assert "actionable_empty_state" in ids
    assert "isolated_demo" in ids
    assert "mechanical_discoverability" in ids
    assert "first_value" in ids
