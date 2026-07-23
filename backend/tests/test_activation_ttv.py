"""Activation auto-matching + TTV metrics tests."""

from __future__ import annotations

from datetime import datetime, timedelta
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.database.models import (
    ActivationMatchingJob,
    Base,
    Candidate,
    Job,
    JobMatch,
    ProductFunnelEvent,
    User,
)
from app.database.session import get_db
from app.main import create_app
from app.services.activation_matching import (
    maybe_dispatch_after_onboarding,
    profile_min_complete,
    profile_version_for,
    run_matching_job,
)
from app.services.activation_ttv_metrics import build_ttv_latencies, percentile
from app.services.product_funnel import FUNNEL_EVENTS, emit_funnel_event
from tests.test_auth_integration import _sqlite_session


def _client_with_db(monkeypatch):
    monkeypatch.setenv("PRODUCT_FUNNEL_EVENTS_ENABLED", "true")
    monkeypatch.setenv("ACTIVATION_AUTO_MATCHING_ENABLED", "true")
    monkeypatch.setenv("ACTIVATION_TTV_METRICS_ENABLED", "true")
    monkeypatch.setenv("ACTIVATION_TTV_ALERTS_ENABLED", "true")
    monkeypatch.setenv("CELERY_TASK_ALWAYS_EAGER", "true")
    monkeypatch.setenv("BETA_ADMIN_TOKEN", "ops-secret")
    monkeypatch.setenv("OPS_ADMIN_TOKEN", "ops-secret")
    from app.config import get_settings
    from app.limiter import limiter
    from app.tasks.celery_app import apply_celery_runtime_config, celery_app

    get_settings.cache_clear()
    apply_celery_runtime_config()
    celery_app.conf.task_always_eager = True
    try:
        limiter.reset()
    except Exception:
        pass
    db = _sqlite_session()
    for table in (
        User.__table__,
        Candidate.__table__,
        ProductFunnelEvent.__table__,
        ActivationMatchingJob.__table__,
        Job.__table__,
        JobMatch.__table__,
    ):
        table.create(bind=db.get_bind(), checkfirst=True)

    def override_db():
        try:
            yield db
        finally:
            pass

    app = create_app()
    app.dependency_overrides[get_db] = override_db
    return TestClient(app), db, app, get_settings


def _register(client: TestClient, email: str) -> str:
    reg = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "SecurePass123!",
            "gdpr_consent": True,
            "terms_of_service_consent": True,
            "job_data_processing_consent": True,
            "ai_matching_consent": True,
        },
    )
    assert reg.status_code == 201, reg.text
    return reg.json()["access_token"]


def _seed_candidate(db, user_id: int, *, complete: bool = True) -> Candidate:
    c = Candidate(
        user_id=user_id,
        name="Test User",
        skills='["Python"]' if complete else "[]",
        preferred_job_titles='["Backend Engineer"]' if complete else "[]",
        experience_years=3 if complete else 0,
        location="Warsaw" if complete else None,
        cv_text="Python engineer" if complete else None,
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


def test_activation_events_in_taxonomy() -> None:
    for name in (
        "activation_matching_eligible",
        "activation_matching_not_eligible",
        "activation_matching_dispatched",
        "activation_matching_started",
        "activation_matching_completed",
        "activation_matching_failed",
        "activation_first_match_created",
        "activation_ttv_matches_view",
    ):
        assert name in FUNNEL_EVENTS


def test_percentile_null_when_empty() -> None:
    assert percentile([], 50) is None
    assert percentile([10.0, 20.0, 30.0], 50) is not None


def test_onboarding_eligible_dispatches_once(monkeypatch) -> None:
    client, db, app, get_settings = _client_with_db(monkeypatch)
    try:
        token = _register(client, "act-elig@example.com")
        user = db.query(User).filter(User.email == "act-elig@example.com").one()
        _seed_candidate(db, user.id, complete=True)

        with patch(
            "app.services.matching_service.find_top_matches",
            return_value=[{"job_id": 1, "score": 80.0}],
        ):
            # Persist a fake match via side effect
            def _fake_match(db_sess, cand, **kwargs):
                db_sess.add(JobMatch(candidate_id=cand.id, job_id=1, score=80.0))
                # Need a job row? JobMatch may FK to jobs — check model
                return [{"id": 1, "score": 80.0}]

            # Simpler: patch run at celery level after dispatch
            with patch(
                "app.services.activation_matching.find_top_matches",
                create=True,
            ):
                pass

        # Ensure Job table allows JobMatch — create job
        job = Job(
            title="Backend Engineer",
            company="Acme",
            location="Warsaw",
            description="Python",
            requirements="Python",
            job_board="test",
            external_id="act-1",
            url="https://example.com/j1",
            is_validated=True,
        )
        db.add(job)
        db.commit()

        def fake_find(db_sess, cand, **kwargs):
            existing = (
                db_sess.query(JobMatch)
                .filter(JobMatch.candidate_id == cand.id, JobMatch.job_id == job.id)
                .first()
            )
            if not existing:
                db_sess.add(JobMatch(candidate_id=cand.id, job_id=job.id, score=88.0))
                db_sess.flush()
            return [{"job_id": job.id, "score": 88.0, "title": job.title}]

        with patch("app.services.matching_service.find_top_matches", side_effect=fake_find):
            done = client.post(
                "/api/v1/auth/onboarding/complete",
                headers={"Authorization": f"Bearer {token}"},
            )
            assert done.status_code == 200

            jobs = db.query(ActivationMatchingJob).filter(ActivationMatchingJob.user_id == user.id).all()
            assert len(jobs) == 1
            assert jobs[0].status in ("completed", "dispatched", "started")

            # Double complete — no second job
            again = client.post(
                "/api/v1/auth/onboarding/complete",
                headers={"Authorization": f"Bearer {token}"},
            )
            assert again.status_code == 200
            assert (
                db.query(ActivationMatchingJob).filter(ActivationMatchingJob.user_id == user.id).count()
                == 1
            )

            # Re-dispatch same profile version is idempotent
            maybe_dispatch_after_onboarding(db, user, trigger="manual")
            assert (
                db.query(ActivationMatchingJob).filter(ActivationMatchingJob.user_id == user.id).count()
                == 1
            )

            names = {e.event_name for e in db.query(ProductFunnelEvent).filter(ProductFunnelEvent.user_id == user.id)}
            assert "onboarding_completed" in names
            assert "activation_matching_eligible" in names or "activation_matching_dispatched" in names
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()


def test_onboarding_not_eligible(monkeypatch) -> None:
    client, db, app, get_settings = _client_with_db(monkeypatch)
    try:
        token = _register(client, "act-nelig@example.com")
        user = db.query(User).filter(User.email == "act-nelig@example.com").one()
        _seed_candidate(db, user.id, complete=False)

        done = client.post(
            "/api/v1/auth/onboarding/complete",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert done.status_code == 200
        names = [
            e.event_name
            for e in db.query(ProductFunnelEvent).filter(ProductFunnelEvent.user_id == user.id)
        ]
        assert "activation_matching_not_eligible" in names
        assert "activation_matching_dispatched" not in names
        status = client.get(
            "/api/v1/candidates/me/activation-status",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert status.status_code == 200
        assert status.json()["ux_state"] == "profile_incomplete"
        assert status.json()["retry_available"] is False
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()


def test_activation_ttv_view_deduped(monkeypatch) -> None:
    client, db, app, get_settings = _client_with_db(monkeypatch)
    try:
        token = _register(client, "act-view@example.com")
        r1 = client.post(
            "/api/v1/candidates/me/activation-ttv-view",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r1.status_code == 200
        assert r1.json()["recorded"] is True
        r2 = client.post(
            "/api/v1/candidates/me/activation-ttv-view",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r2.status_code == 200
        assert r2.json()["deduped"] is True
        assert (
            db.query(ProductFunnelEvent)
            .filter(ProductFunnelEvent.event_name == "activation_ttv_matches_view")
            .count()
            == 1
        )
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()


def test_ttv_percentiles_null_without_data(monkeypatch) -> None:
    _, db, app, get_settings = _client_with_db(monkeypatch)
    try:
        snap = build_ttv_latencies(db)
        pair = snap["pairs"]["signup_to_onboarding"]
        assert pair["sample_size"] == 0
        assert pair["p50_seconds"] is None
        assert pair["p90_seconds"] is None
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()


def test_ttv_percentiles_with_samples(monkeypatch) -> None:
    _, db, app, get_settings = _client_with_db(monkeypatch)
    try:
        now = datetime.utcnow()
        for i in range(5):
            u = User(
                email=f"ttv{i}@example.com",
                hashed_password="x",
                created_at=now - timedelta(hours=10),
                gdpr_consent_at=now,
            )
            db.add(u)
            db.flush()
            emit_funnel_event(
                db,
                event_name="signup_completed",
                user_id=u.id,
                once=False,
                commit=False,
            )
            # backdate signup
            row = (
                db.query(ProductFunnelEvent)
                .filter(
                    ProductFunnelEvent.user_id == u.id,
                    ProductFunnelEvent.event_name == "signup_completed",
                )
                .one()
            )
            row.occurred_at = now - timedelta(hours=10)
            emit_funnel_event(
                db,
                event_name="onboarding_completed",
                user_id=u.id,
                once=False,
                commit=False,
            )
            row2 = (
                db.query(ProductFunnelEvent)
                .filter(
                    ProductFunnelEvent.user_id == u.id,
                    ProductFunnelEvent.event_name == "onboarding_completed",
                )
                .one()
            )
            row2.occurred_at = now - timedelta(hours=10 - i)
        db.commit()
        snap = build_ttv_latencies(db)
        pair = snap["pairs"]["signup_to_onboarding"]
        assert pair["sample_size"] == 5
        assert pair["p50_seconds"] is not None
        assert pair["p50_seconds"] >= 0
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()


def test_test_accounts_excluded_from_north_star(monkeypatch) -> None:
    client, db, app, get_settings = _client_with_db(monkeypatch)
    try:
        token = _register(client, "smoke-exclude@example.com")
        user = db.query(User).filter(User.email == "smoke-exclude@example.com").one()
        user.exclude_from_product_metrics = True
        db.commit()
        emit_funnel_event(
            db,
            event_name="interview_scheduled",
            user_id=user.id,
            once=False,
            commit=True,
        )
        funnel = client.get(
            "/api/v1/admin/funnel?days=7",
            headers={"Authorization": "Bearer ops-secret"},
        )
        assert funnel.status_code == 200
        body = funnel.json()
        assert body["north_star"]["value_7d"] == 0
        assert body["activation"] is not None
        assert "ttv_latencies" in body["activation"]

        include = client.get(
            "/api/v1/admin/funnel?days=7&include_test_accounts=true",
            headers={"Authorization": "Bearer ops-secret"},
        )
        assert include.json()["north_star"]["value_7d"] >= 1
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()


def test_flag_disables_auto_matching(monkeypatch) -> None:
    monkeypatch.setenv("ACTIVATION_AUTO_MATCHING_ENABLED", "false")
    client, db, app, get_settings = _client_with_db(monkeypatch)
    try:
        monkeypatch.setenv("ACTIVATION_AUTO_MATCHING_ENABLED", "false")
        get_settings.cache_clear()
        token = _register(client, "act-off@example.com")
        user = db.query(User).filter(User.email == "act-off@example.com").one()
        _seed_candidate(db, user.id, complete=True)
        client.post(
            "/api/v1/auth/onboarding/complete",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert db.query(ActivationMatchingJob).count() == 0
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()


def test_validation_failure_no_retry_flag(monkeypatch) -> None:
    _, db, app, get_settings = _client_with_db(monkeypatch)
    try:
        u = User(email="val@example.com", hashed_password="x", gdpr_consent_at=datetime.utcnow())
        db.add(u)
        db.flush()
        c = _seed_candidate(db, u.id, complete=False)
        ok, reason = profile_min_complete(c)
        assert ok is False
        assert reason == "profile_incomplete"
        result = maybe_dispatch_after_onboarding(db, u, trigger="test")
        assert result["retry_available"] is False
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()


def test_admin_funnel_auth_required(monkeypatch) -> None:
    client, db, app, get_settings = _client_with_db(monkeypatch)
    try:
        res = client.get("/api/v1/admin/funnel")
        assert res.status_code in (401, 403)
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()


def test_matching_completed_without_matches(monkeypatch) -> None:
    client, db, app, get_settings = _client_with_db(monkeypatch)
    try:
        token = _register(client, "act-empty@example.com")
        user = db.query(User).filter(User.email == "act-empty@example.com").one()
        _seed_candidate(db, user.id, complete=True)
        with patch("app.services.matching_service.find_top_matches", return_value=[]):
            client.post(
                "/api/v1/auth/onboarding/complete",
                headers={"Authorization": f"Bearer {token}"},
            )
            job = db.query(ActivationMatchingJob).filter(ActivationMatchingJob.user_id == user.id).one()
            # Eager may have completed
            if job.status != "completed":
                run_matching_job(db, job.id)
                db.refresh(job)
            assert job.status == "completed"
            assert (job.match_count or 0) == 0
            status = client.get(
                "/api/v1/candidates/me/activation-status",
                headers={"Authorization": f"Bearer {token}"},
            )
            assert status.json()["ux_state"] in ("no_matches", "matches_ready", "matching_in_progress")
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()


def test_profile_version_stable(monkeypatch) -> None:
    _, db, app, get_settings = _client_with_db(monkeypatch)
    try:
        u = User(email="pv@example.com", hashed_password="x", gdpr_consent_at=datetime.utcnow())
        db.add(u)
        db.flush()
        c = _seed_candidate(db, u.id, complete=True)
        assert profile_version_for(c) == profile_version_for(c)
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
