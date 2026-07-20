"""Activation cohort registry + metrics exclusion tests."""

from fastapi.testclient import TestClient

from app.database.models import (
    ActivationCohort,
    ActivationCohortParticipant,
    Base,
    ProductFunnelEvent,
    User,
)
from app.database.session import get_db
from app.main import create_app
from app.services.metrics_exclusion import (
    apply_metrics_exclusion_to_user,
    should_exclude_from_product_metrics,
)
from app.services.product_funnel import emit_funnel_event
from tests.test_auth_integration import _sqlite_session


def _client_with_db(monkeypatch):
    monkeypatch.setenv("BETA_ADMIN_TOKEN", "ops-secret")
    monkeypatch.setenv("PRODUCT_FUNNEL_EVENTS_ENABLED", "true")
    monkeypatch.setenv("ACTIVATION_AUTO_MATCHING_ENABLED", "false")
    from app.config import get_settings

    get_settings.cache_clear()
    db = _sqlite_session()
    bind = db.get_bind()
    for table in (
        ProductFunnelEvent.__table__,
        ActivationCohort.__table__,
        ActivationCohortParticipant.__table__,
    ):
        table.create(bind=bind, checkfirst=True)

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
    return TestClient(app), db, app, get_settings


def _register(client: TestClient, email: str, **utm) -> str:
    payload = {
        "email": email,
        "password": "SecurePass123!",
        "gdpr_consent": True,
        "terms_of_service_consent": True,
        "job_data_processing_consent": True,
        "ai_matching_consent": True,
        **utm,
    }
    reg = client.post("/api/v1/auth/register", json=payload)
    assert reg.status_code == 201, reg.text
    return reg.json()["access_token"]


def test_should_exclude_heuristics() -> None:
    assert should_exclude_from_product_metrics(email="smoke-user@real.pl") is True
    assert should_exclude_from_product_metrics(email="demo.person@company.pl") is True
    assert should_exclude_from_product_metrics(email="real@twin.internal") is True
    assert should_exclude_from_product_metrics(utm_source="smoke") is True
    assert should_exclude_from_product_metrics(utm_campaign="activation_smoke_test") is True
    assert should_exclude_from_product_metrics(email="candidate@firma.pl", utm_source="pilot") is False


def test_register_auto_tags_smoke_email(monkeypatch) -> None:
    client, db, app, get_settings = _client_with_db(monkeypatch)
    try:
        _register(client, "smoke-cohort@firma.pl")
        user = db.query(User).filter(User.email == "smoke-cohort@firma.pl").one()
        assert user.exclude_from_product_metrics is True
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()


def test_register_utm_smoke_excludes(monkeypatch) -> None:
    client, db, app, get_settings = _client_with_db(monkeypatch)
    try:
        _register(client, "normal-looking@firma.pl", utm_source="smoke", utm_campaign="qa")
        user = db.query(User).filter(User.email == "normal-looking@firma.pl").one()
        assert user.exclude_from_product_metrics is True
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()


def test_cohort_crud_and_evidence_exclusion(monkeypatch) -> None:
    client, db, app, get_settings = _client_with_db(monkeypatch)
    headers = {"Authorization": "Bearer ops-secret"}
    try:
        _register(client, "real-pilot@firma.pl", utm_source="pilot", utm_campaign="activation_pl_pilot_2026_07")
        _register(client, "smoke-exclude-ns@firma.pl")
        real = db.query(User).filter(User.email == "real-pilot@firma.pl").one()
        smoke = db.query(User).filter(User.email == "smoke-exclude-ns@firma.pl").one()
        assert real.exclude_from_product_metrics is False
        assert smoke.exclude_from_product_metrics is True

        create = client.post(
            "/api/v1/admin/cohorts",
            headers=headers,
            json={
                "name": "Test PL Pilot",
                "cohort_type": "mixed",
                "market": "PL",
                "target_count": 50,
                "status": "recruiting",
                "campaign": "test_activation_cohort",
            },
        )
        assert create.status_code == 200, create.text
        cohort_id = create.json()["id"]

        add_real = client.post(
            f"/api/v1/admin/cohorts/{cohort_id}/participants",
            headers=headers,
            json={"email": "real-pilot@firma.pl", "role": "candidate", "status": "joined"},
        )
        assert add_real.status_code == 200, add_real.text
        add_smoke = client.post(
            f"/api/v1/admin/cohorts/{cohort_id}/participants",
            headers=headers,
            json={"email": "smoke-exclude-ns@firma.pl", "role": "candidate", "status": "joined"},
        )
        assert add_smoke.status_code == 200, add_smoke.text

        emit_funnel_event(
            db,
            event_name="interview_scheduled",
            user_id=real.id,
            once=False,
            commit=True,
        )
        emit_funnel_event(
            db,
            event_name="interview_scheduled",
            user_id=smoke.id,
            once=False,
            commit=True,
        )

        funnel = client.get("/api/v1/admin/funnel?days=7", headers=headers)
        assert funnel.status_code == 200
        assert funnel.json()["north_star"]["value_7d"] >= 1

        evidence = client.get(f"/api/v1/admin/cohorts/{cohort_id}/evidence", headers=headers)
        assert evidence.status_code == 200, evidence.text
        body = evidence.json()
        assert body["participants_total"] == 2
        assert body["participants_real"] == 1
        assert body["participants_excluded_metrics"] == 1
        assert body["north_star_excluding_test"] >= 1
        assert body["north_star_including_test_labeled"]["value"] >= 1
        assert "FOUNDERS_ACTION_REQUIRED_recruit_users" in body["blockers"]
        assert body["gates"]["gate_f"] == "PENDING"
        assert body["gates"]["launch"] == "NO-GO"

        excl = client.patch(
            f"/api/v1/admin/cohorts/{cohort_id}/participants/{add_real.json()['id']}",
            headers=headers,
            json={"status": "excluded"},
        )
        assert excl.status_code == 200
        db.refresh(real)
        assert real.exclude_from_product_metrics is True
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()


def test_ensure_pl_pilot_idempotent(monkeypatch) -> None:
    client, db, app, get_settings = _client_with_db(monkeypatch)
    headers = {"Authorization": "Bearer ops-secret"}
    try:
        a = client.post("/api/v1/admin/cohorts/ensure-pl-pilot", headers=headers)
        b = client.post("/api/v1/admin/cohorts/ensure-pl-pilot", headers=headers)
        assert a.status_code == 200
        assert b.status_code == 200
        assert a.json()["id"] == b.json()["id"]
        assert db.query(ActivationCohort).count() == 1
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()


def test_retention_excludes_smoke(monkeypatch) -> None:
    client, db, app, get_settings = _client_with_db(monkeypatch)
    headers = {"Authorization": "Bearer ops-secret"}
    try:
        _register(client, "ret-real@firma.pl")
        _register(client, "smoke-ret@firma.pl")
        ret = client.get("/api/v1/admin/retention?weeks=8", headers=headers)
        assert ret.status_code == 200
        body = ret.json()
        assert body.get("test_accounts_excluded") is True
        total = sum(c["signups"] for c in body.get("cohorts") or [])
        assert total >= 1
        # smoke user must not inflate default retention
        smoke = db.query(User).filter(User.email == "smoke-ret@firma.pl").one()
        assert smoke.exclude_from_product_metrics is True
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()


def test_apply_never_clears_manual_flag() -> None:
    user = User(email="keep@firma.pl", hashed_password="x")
    user.exclude_from_product_metrics = True
    assert apply_metrics_exclusion_to_user(user) is True
    assert user.exclude_from_product_metrics is True
