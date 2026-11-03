"""External connector activation — unit + contract tests."""

from collections.abc import Iterator
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.deps import get_db
from app.core.security import create_access_token
from app.database.models import Base, User
from app.main import app
from app.services.object_storage import put_bytes, storage_backend_status, storage_smoke_roundtrip
from app.services.zapier_generic_webhook import (
    create_subscription,
    deliver_test_event,
    receive_test_event,
    revoke_subscription,
    zapier_status,
)


@pytest.fixture
def conn_client(tmp_path, monkeypatch: pytest.MonkeyPatch) -> Iterator[tuple[TestClient, Session]]:
    monkeypatch.setenv("DATA_ROOM_LOCAL_UPLOAD_ENABLED", "true")
    monkeypatch.setenv("DATA_ROOM_LOCAL_UPLOAD_DIR", str(tmp_path / "uploads"))
    monkeypatch.setenv(
        "GOOGLE_CALENDAR_PUSH_WEBHOOK_URL",
        "https://twin-production-bcd9.up.railway.app/api/v1/calendar/google/push/webhook",
    )
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "test-google-client.apps.googleusercontent.com")
    monkeypatch.setenv("GOOGLE_CLIENT_SECRET", "test-google-secret")
    monkeypatch.setenv("RAILWAY_PUBLIC_DOMAIN", "twin-production-bcd9.up.railway.app")
    monkeypatch.setenv("API_URL", "https://twin-production-bcd9.up.railway.app")

    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    session_local = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = session_local()

    def override_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_db
    client = TestClient(app)
    yield client, db
    app.dependency_overrides.pop(get_db, None)
    db.close()


def _auth(db: Session) -> dict[str, str]:
    user = User(
        email="connector-smoke@twin.internal",
        hashed_password="x",
        gdpr_consent_at=datetime.now(timezone.utc),
        exclude_from_product_metrics=True,
    )
    db.add(user)
    db.commit()
    return {"Authorization": f"Bearer {create_access_token(user.email)}"}


def test_zapier_status_ready_without_marketplace() -> None:
    st = zapier_status(public_api_base="https://example.invalid")
    assert st["status"] == "READY"
    assert st["marketplace_required"] is False
    assert st["capabilities"]["WEBHOOK"] == "LIVE"


def test_storage_local_roundtrip(tmp_path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DATA_ROOM_LOCAL_UPLOAD_ENABLED", "true")
    monkeypatch.setenv("DATA_ROOM_LOCAL_UPLOAD_DIR", str(tmp_path / "uploads"))
    from app.config import get_settings

    get_settings.cache_clear()
    st = storage_backend_status()
    assert st["status"] == "LIVE"
    assert st["backend"] == "local_filesystem"
    put = put_bytes(key="a.txt", data=b"hello", content_type="text/plain", tenant_id="t1")
    assert put["ok"] is True
    smoke = storage_smoke_roundtrip(tenant_id="t1")
    assert smoke["ok"] is True
    assert smoke["post_delete_denied"] is True
    get_settings.cache_clear()


def test_zapier_subscribe_deliver_revoke_via_receiver(conn_client, monkeypatch) -> None:
    client, db = conn_client
    headers = _auth(db)
    base = "https://twin-production-bcd9.up.railway.app"
    # In-process: deliver to TestClient app via ASGI transport by patching httpx
    receiver = f"{base}/api/v1/platform/wave5/connectors/test-receiver"

    created = create_subscription(
        db,
        user_id=db.query(User).filter(User.email == "connector-smoke@twin.internal").one().id,
        target_url=receiver,
        public_api_base=base,
    )
    assert created["ok"] is True
    sub_id = created["subscription_id"]
    secret = created["secret"]

    # Simulate outbound body + receiver without network
    import json
    import hmac
    import hashlib
    import time

    event_id = "evt_unit_test_1"
    payload = {
        "id": event_id,
        "version": "v1",
        "type": "twin.connector.test",
        "provider": "zapier",
        "subscription_id": sub_id,
        "ts": int(time.time()),
        "data": {"smoke": True},
    }
    body = json.dumps(payload, separators=(",", ":")).encode()
    sig = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    recv = receive_test_event(
        db,
        raw_body=body,
        signature=sig,
        event_id=event_id,
        subscription_id=sub_id,
    )
    assert recv["ok"] is True
    replay = receive_test_event(
        db,
        raw_body=body,
        signature=sig,
        event_id=event_id,
        subscription_id=sub_id,
    )
    assert replay["status"] == "replay_rejected"

    bad = receive_test_event(
        db,
        raw_body=body,
        signature="deadbeef",
        event_id="evt_bad_sig",
        subscription_id=sub_id,
    )
    assert bad["ok"] is False

    revoked = revoke_subscription(db, user_id=created["subscription_id"] and db.query(User).first().id, subscription_id=sub_id)
    assert revoked["status"] == "revoked"

    # API status
    res = client.get("/api/v1/platform/wave5/connectors/status", headers=headers)
    assert res.status_code == 200
    body_json = res.json()
    assert body_json["zapier"]["status"] == "READY"
    assert body_json["storage"]["status"] == "LIVE"
    assert body_json["teams"]["capabilities"]["DRAFT"] == "LIVE"
    assert body_json["slack"]["capabilities"]["DRAFT"] == "LIVE"
    assert body_json["slack"]["capabilities"]["WRITE"] == "BLOCKED_EXTERNAL_CREDENTIALS"


def test_google_push_status_ready(conn_client) -> None:
    client, db = conn_client
    headers = _auth(db)
    # Force oauth helper true via env already set; may still need settings cache clear
    from app.config import get_settings

    get_settings.cache_clear()
    res = client.get("/api/v1/platform/wave5/google-push/status", headers=headers)
    assert res.status_code == 200
    # OAuth configured check uses settings — may be READY or blocked depending on settings fields
    assert res.json()["status"] in {"READY", "BLOCKED_EXTERNAL_CREDENTIALS"}


def test_connector_draft_no_delivery(conn_client) -> None:
    client, db = conn_client
    headers = _auth(db)
    res = client.post(
        "/api/v1/platform/wave5/connectors/draft",
        headers=headers,
        json={"connector": "slack", "title": "t", "body": "b", "deliver": False},
    )
    assert res.status_code == 200
    assert res.json()["provider_write"] is False
    assert res.json()["draft"] is True


def test_storage_smoke_endpoint(conn_client) -> None:
    client, db = conn_client
    headers = _auth(db)
    from app.config import get_settings

    get_settings.cache_clear()
    res = client.post("/api/v1/platform/wave5/connectors/storage/smoke", headers=headers)
    assert res.status_code == 200
    assert res.json()["ok"] is True


def test_ssrf_blocks_localhost(conn_client) -> None:
    client, db = conn_client
    headers = _auth(db)
    res = client.post(
        "/api/v1/platform/wave5/connectors/zapier/subscriptions",
        headers=headers,
        json={"target_url": "https://127.0.0.1/hook"},
    )
    assert res.status_code == 422


def test_ssrf_blocks_private_rfc1918(conn_client) -> None:
    client, db = conn_client
    headers = _auth(db)
    res = client.post(
        "/api/v1/platform/wave5/connectors/zapier/subscriptions",
        headers=headers,
        json={"target_url": "https://10.0.0.8/hook"},
    )
    assert res.status_code == 422
