"""Product funnel instrumentation + retention cohort tests."""

from datetime import datetime, timedelta

from fastapi.testclient import TestClient

from app.database.models import ProductFunnelEvent, User
from app.database.session import get_db
from app.main import create_app
from app.services.product_funnel import (
    FUNNEL_EVENTS,
    build_cohort_retention,
    build_funnel_snapshot,
    emit_funnel_event,
)
from tests.test_auth_integration import _sqlite_session


def _client_with_db():
    db = _sqlite_session()

    def override_db():
        try:
            yield db
        finally:
            pass

    from app.limiter import limiter

    try:
        limiter.reset()
    except Exception:
        pass

    app = create_app()
    app.dependency_overrides[get_db] = override_db
    return TestClient(app), db, app


def test_funnel_taxonomy_stable() -> None:
    assert "signup_completed" in FUNNEL_EVENTS
    assert "onboarding_completed" in FUNNEL_EVENTS
    assert "first_match" in FUNNEL_EVENTS
    assert "interview_scheduled" in FUNNEL_EVENTS


def test_register_and_onboarding_emit_funnel(monkeypatch) -> None:
    monkeypatch.setenv("BETA_ADMIN_TOKEN", "ops-secret")
    monkeypatch.setenv("PRODUCT_FUNNEL_EVENTS_ENABLED", "true")
    monkeypatch.setenv("ACTIVATION_AUTO_MATCHING_ENABLED", "false")
    from app.config import get_settings

    get_settings.cache_clear()
    client, db, app = _client_with_db()
    try:
        # Ensure table exists for sqlite test harness
        from app.database.models import Base
        from sqlalchemy import create_engine

        ProductFunnelEvent.__table__.create(bind=db.get_bind(), checkfirst=True)

        reg = client.post(
            "/api/v1/auth/register",
            json={
                "email": "funnel@example.com",
                "password": "SecurePass123!",
                "gdpr_consent": True,
                "terms_of_service_consent": True,
                "job_data_processing_consent": True,
                "ai_matching_consent": True,
            },
        )
        assert reg.status_code == 201
        token = reg.json()["access_token"]
        signup_rows = (
            db.query(ProductFunnelEvent)
            .filter(ProductFunnelEvent.event_name == "signup_completed")
            .count()
        )
        assert signup_rows == 1

        done = client.post(
            "/api/v1/auth/onboarding/complete",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert done.status_code == 200
        assert (
            db.query(ProductFunnelEvent)
            .filter(ProductFunnelEvent.event_name == "onboarding_completed")
            .count()
            == 1
        )

        # Idempotent once-per-user
        again = client.post(
            "/api/v1/auth/onboarding/complete",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert again.status_code == 200
        assert (
            db.query(ProductFunnelEvent)
            .filter(ProductFunnelEvent.event_name == "onboarding_completed")
            .count()
            == 1
        )

        metrics = client.get(
            "/api/v1/admin/metrics",
            headers={"Authorization": "Bearer ops-secret"},
        )
        assert metrics.status_code == 200
        body = metrics.json()
        assert body["funnel_instrumentation_enabled"] is True
        assert "north_star_value_7d" in body

        funnel = client.get(
            "/api/v1/admin/funnel",
            headers={"Authorization": "Bearer ops-secret"},
        )
        assert funnel.status_code == 200
        assert funnel.json()["north_star"]["name"] == "weekly_acceptance_ready_users"

        retention = client.get(
            "/api/v1/admin/retention?weeks=4",
            headers={"Authorization": "Bearer ops-secret"},
        )
        assert retention.status_code == 200
        assert "cohorts" in retention.json()
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()


def test_funnel_disabled_no_write(monkeypatch) -> None:
    monkeypatch.setenv("PRODUCT_FUNNEL_EVENTS_ENABLED", "false")
    from app.config import get_settings

    get_settings.cache_clear()
    client, db, app = _client_with_db()
    try:
        ProductFunnelEvent.__table__.create(bind=db.get_bind(), checkfirst=True)
        reg = client.post(
            "/api/v1/auth/register",
            json={
                "email": "nofunnel@example.com",
                "password": "SecurePass123!",
                "gdpr_consent": True,
                "terms_of_service_consent": True,
                "job_data_processing_consent": True,
                "ai_matching_consent": True,
            },
        )
        assert reg.status_code == 201
        assert db.query(ProductFunnelEvent).count() == 0
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()


def test_cohort_retention_proxy(monkeypatch) -> None:
    monkeypatch.setenv("PRODUCT_FUNNEL_EVENTS_ENABLED", "true")
    from app.config import get_settings

    get_settings.cache_clear()
    _, db, app = _client_with_db()
    try:
        ProductFunnelEvent.__table__.create(bind=db.get_bind(), checkfirst=True)
        User.__table__.create(bind=db.get_bind(), checkfirst=True)
        now = datetime.utcnow()
        u = User(
            email="cohort@example.com",
            hashed_password="x",
            created_at=now - timedelta(days=3),
            onboarding_completed_at=now - timedelta(days=2),
            gdpr_consent_at=now,
        )
        db.add(u)
        db.flush()
        emit_funnel_event(
            db,
            event_name="signup_completed",
            user_id=u.id,
            commit=False,
        )
        emit_funnel_event(
            db,
            event_name="onboarding_completed",
            user_id=u.id,
            commit=True,
        )
        snap = build_funnel_snapshot(db, days=30)
        assert snap["unique_users_all_time"]["onboarding_completed"] >= 1
        cohorts = build_cohort_retention(db, weeks=4)
        assert len(cohorts["cohorts"]) >= 1
        assert cohorts["cohorts"][0]["signups"] >= 1
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
