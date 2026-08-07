"""Real canary candidate designation unit tests (no real person; teardown to 0)."""

from __future__ import annotations

import pytest

from app.database.models import RealCanaryCandidateDesignation
from app.services import canary_designation as des
from tests.test_auth_integration import _sqlite_session


def _db():
    db = _sqlite_session()
    RealCanaryCandidateDesignation.__table__.create(db.get_bind(), checkfirst=True)
    return db


def test_not_designated_default():
    db = _db()
    try:
        st = des.designation_status(db)
        assert st["status"] == "NOT_DESIGNATED"
        assert st["gate_ready"] is False
        assert st["active_count"] == 0
        assert st["never_sends_invite"] is True
    finally:
        db.close()


def test_designate_masks_and_encrypts():
    db = _db()
    try:
        out = des.designate(
            db,
            delivery_identity="Founder.Probe@Canary-Designation.Invalid",
            secure_roster_reference="roster_ref_unit_1",
        )
        assert out["status"] == "DESIGNATED_READY"
        assert out["gate_ready"] is True
        assert out["active_count"] == 1
        assert out["delivery_identity_masked"]
        assert "@" in out["delivery_identity_masked"]
        assert "founder.probe" not in (out["delivery_identity_masked"] or "").lower()
        row = db.query(RealCanaryCandidateDesignation).one()
        assert "founder.probe" not in row.delivery_identity_ciphertext.lower()
        assert "Founder.Probe" not in (row.audit_json or "")
        plain = des.decrypt_for_delivery_boundary(db, designation_id=row.designation_id)
        assert plain == "founder.probe@canary-designation.invalid"
        # teardown
        des.revoke(db)
        assert des.designation_status(db)["active_count"] == 0
    finally:
        db.close()


def test_reject_fixture_and_synth():
    db = _db()
    try:
        with pytest.raises(ValueError, match="fixture|blocked"):
            des.designate(db, delivery_identity="a@example.com")
        with pytest.raises(ValueError, match="synthetic"):
            des.designate(db, delivery_identity="synth.user@mail.proton.me")
        with pytest.raises(ValueError, match="blank|invalid"):
            des.designate(db, delivery_identity="not-an-email")
        assert des.designation_status(db)["active_count"] == 0
    finally:
        db.close()


def test_replace_keeps_singleton():
    db = _db()
    try:
        des.designate(db, delivery_identity="one@canary-designation.invalid")
        out = des.designate(db, delivery_identity="two@canary-designation.invalid", replace_existing=True)
        assert out["active_count"] == 1
        assert out["delivery_identity_masked"].startswith("tw")
        des.revoke(db)
        assert des.designation_status(db)["active_count"] == 0
    finally:
        db.close()


def test_activation_preflight_does_not_activate():
    db = _db()
    try:
        pf = des.activation_preflight(db)
        assert pf["activates"] is False
        assert pf["raises_caps"] is False
        assert "REAL_CANARY_CANDIDATE_NOT_DESIGNATED" in pf["blockers"]
        des.designate(db, delivery_identity="ready@canary-designation.invalid")
        pf2 = des.activation_preflight(db)
        assert pf2["ready_for_founder_activation"] is True
        assert pf2["consumes_designation_id"]
        assert pf2["mutates_state"] is False
        des.revoke(db)
    finally:
        db.close()
