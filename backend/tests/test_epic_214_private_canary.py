"""Epic 2.14 — private one-candidate canary readiness unit tests (synthetic)."""

from __future__ import annotations

from app.database.models import (
    Candidate,
    CandidateCanaryFrictionEvent,
    CandidateGuidedFirstValue,
    OneCandidateCanaryControl,
    User,
)
from app.services import canary_journey as journey
from app.services import first_value_ladder as ladder
from app.services import private_canary as canary
from tests.test_auth_integration import _sqlite_session


def _db():
    db = _sqlite_session()
    bind = db.get_bind()
    for table in (
        User.__table__,
        Candidate.__table__,
        CandidateGuidedFirstValue.__table__,
        OneCandidateCanaryControl.__table__,
        CandidateCanaryFrictionEvent.__table__,
    ):
        table.create(bind=bind, checkfirst=True)
    user = User(
        email="epic214@canary.test",
        hashed_password="x",
        gdpr_consent_at=__import__("datetime").datetime.utcnow(),
        exclude_from_product_metrics=True,
    )
    db.add(user)
    db.flush()
    cand = Candidate(user_id=user.id, name="Epic214", skills="[]", experience_years=1)
    db.add(cand)
    db.commit()
    db.refresh(user)
    db.refresh(cand)
    return db, user, cand


def test_default_ready_inactive_never_auto_active():
    db, _, _ = _db()
    try:
        snap = canary.snapshot(db)
        assert snap["state"] == canary.STATE_READY_INACTIVE
        assert snap["activation_command"] == canary.ACTIVATION_PREPARED_NOT_EXECUTED
        assert snap["active_one_candidate"] is False
        assert snap["never_auto_active"] is True
        assert snap["real_invites_created"] == 0
        assert snap["public_enrollment"] is False
    finally:
        db.close()


def test_dry_run_invite_does_not_increment():
    db, _, _ = _db()
    try:
        canary.apply_action(db, action="prepare")
        before = canary.snapshot(db)["real_invites_created"]
        after = canary.apply_action(db, action="create_invite_dry_run")
        assert after["real_invites_created"] == before == 0
        assert after["activation_command"] == canary.ACTIVATION_PREPARED_NOT_EXECUTED
        assert after["active_one_candidate"] is False
    finally:
        db.close()


def test_evaluate_gate_without_activating():
    db, _, _ = _db()
    try:
        # Seed companion tables used by checklist (may fail soft — still no ACTIVE)
        out = canary.evaluate_gate(db)
        assert out["active_one_candidate"] is False
        assert out["activation_command"] == canary.ACTIVATION_PREPARED_NOT_EXECUTED
        assert out["public_signup"] is False
        assert "gate_ready" in out
    finally:
        db.close()


def test_ladder_synthetic_does_not_set_real_fv():
    db, user, cand = _db()
    try:
        st = ladder.advance_ladder(
            db, candidate_id=cand.id, user_id=user.id, target="ACTIONED", lane="SYNTHETIC"
        )
        assert st["ladder"] == "ACTIONED"
        assert st["real_first_value_reached"] is False
        assert "route_visit_alone" in st["not_sufficient"]
    finally:
        db.close()


def test_disclosure_no_eighth_nav():
    cat = journey.disclosure_catalog()
    assert cat["primary_ia_count"] == 7
    assert cat["eighth_nav_item"] is False
    assert "CORE_NOW" in cat["tiers"]
    assert journey.adoption_registry()["synthetic_never_flips_real"] is True


def test_friction_strips_free_text():
    db, user, cand = _db()
    try:
        out = journey.record_friction(
            db,
            candidate_id=cand.id,
            user_id=user.id,
            event_code="search_no_results",
            surface="workspace_search",
            lane="SYNTHETIC",
            payload={"q": "secret query", "count": 0, "reason_code": "empty"},
        )
        assert out["query_logged"] is False
        assert out["kpi_excluded"] is True
        row = db.query(CandidateCanaryFrictionEvent).one()
        assert "secret" not in (row.payload_json or "")
        assert '"count":0' in row.payload_json or '"count": 0' in row.payload_json
    finally:
        db.close()


def test_abort_clears_gate():
    db, _, _ = _db()
    try:
        canary.apply_action(db, action="prepare")
        canary.evaluate_gate(db)
        out = canary.apply_action(db, action="abort", reason="founder_stop")
        assert out["state"] == canary.STATE_ABORTED
        assert out["gate_ready"] is False
        assert out["active_one_candidate"] is False
    finally:
        db.close()


def test_ladder_ready_reset_clears_real_flag():
    db, user, cand = _db()
    try:
        ladder.advance_ladder(
            db, candidate_id=cand.id, user_id=user.id, target="ACTIONED", lane="REAL"
        )
        st = ladder.ladder_status(db, candidate_id=cand.id, user_id=user.id)
        assert st["real_first_value_reached"] is True
        reset = ladder.advance_ladder(
            db, candidate_id=cand.id, user_id=user.id, target="READY", lane="SYNTHETIC"
        )
        assert reset["ladder"] == "READY"
        assert reset["real_first_value_reached"] is False
        again = ladder.advance_ladder(
            db, candidate_id=cand.id, user_id=user.id, target="ACTIONED", lane="SYNTHETIC"
        )
        assert again["ladder"] == "ACTIONED"
        assert again["real_first_value_reached"] is False
    finally:
        db.close()
