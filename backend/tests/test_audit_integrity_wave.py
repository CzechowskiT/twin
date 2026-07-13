"""Audit integrity for Wave C activation and talent pool events."""

from sqlalchemy import inspect

from app.database.models import Base, RecruiterActivationEvent
from app.services.recruiter_activation_persistence import record_workspace_connected
from tests.test_auth_integration import _sqlite_session


def test_activation_events_append_only_table() -> None:
    db = _sqlite_session()
    try:
        Base.metadata.create_all(bind=db.get_bind())
        insp = inspect(db.get_bind())
        assert insp.has_table("recruiter_activation_events")
        record_workspace_connected(db, company_slug="nova-hiring-pl")
        count = db.query(RecruiterActivationEvent).count()
        record_workspace_connected(db, company_slug="nova-hiring-pl")
        db.commit()
        assert db.query(RecruiterActivationEvent).count() == count
    finally:
        db.close()


def test_activation_event_has_timestamp() -> None:
    db = _sqlite_session()
    try:
        Base.metadata.create_all(bind=db.get_bind())
        record_workspace_connected(db, company_slug="test-co")
        row = db.query(RecruiterActivationEvent).first()
        assert row is not None
        assert row.created_at is not None
    finally:
        db.close()
