"""Disposable isolated-container migration and HTTP checks with CI credentials."""
import base64
import hashlib
import json
import sys
from urllib.parse import parse_qs, urlparse

from app.config import get_settings

settings = get_settings()
assert settings.api_url == "https://container-verification.invalid"
assert settings.agent_dispatch_token == "ci-only-dispatch-token"
assert settings.agent_dispatch_billable_execution_enabled is False
assert "twin-verify-db:5432/twin_" in settings.database_url

if sys.argv[1] == "db":
    from alembic.config import Config
    from alembic.script import ScriptDirectory
    from sqlalchemy import create_engine, text

    heads = ScriptDirectory.from_config(Config("alembic.ini")).get_heads()
    assert len(heads) == 1, heads
    with create_engine(settings.database_url).begin() as connection:
        current = connection.execute(text("SELECT version_num FROM alembic_version")).scalars().all()
        assert current == heads, (current, heads)
        if "--preserved-row" in sys.argv:
            count = connection.execute(text("SELECT count(*) FROM users WHERE email='ci-preservation@example.invalid'")).scalar_one()
            assert count == 1
    print("PostgreSQL migration verification: PASS", heads[0])
elif sys.argv[1] == "http":
    import httpx

    with httpx.Client(base_url="http://127.0.0.1:8000", trust_env=False, timeout=10) as client:
        health = client.get("/api/v1/health", params={"db":"true"})
        assert health.status_code == 200 and health.json()["db_ok"] is True
        anonymous = client.post("/api/internal/agent-dispatch/mcp", json={"jsonrpc":"2.0","id":1,"method":"tools/list"})
        assert anonymous.status_code == 401
        redirect = "http://127.0.0.1:49152/callback/container-verification"
        registration = client.post("/api/internal/agent-dispatch/oauth/register", json={"redirect_uris":[redirect]})
        assert registration.status_code == 200
        client_id = registration.json()["client_id"]
        verifier = "offline-container-verifier-" + "x" * 43
        challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=").decode()
        resource = settings.api_url + "/api/internal/agent-dispatch/mcp"
        consent = client.post("/api/internal/agent-dispatch/oauth/authorize", params={
            "client_id":client_id,"redirect_uri":redirect,"response_type":"code",
            "code_challenge":challenge,"code_challenge_method":"S256",
            "scope":"agent_runs:read","resource":resource,"state":"ci-local-only",
        }, data={"token":settings.agent_dispatch_token}, follow_redirects=False)
        assert consent.status_code == 302
        query = parse_qs(urlparse(consent.headers["location"]).query)
        assert query["state"] == ["ci-local-only"]
        grant = client.post("/api/internal/agent-dispatch/oauth/token", data={
            "grant_type":"authorization_code","client_id":client_id,"redirect_uri":redirect,
            "code":query["code"][0],"code_verifier":verifier,"resource":resource,
        })
        assert grant.status_code == 200 and grant.json()["scope"] == "agent_runs:read"
        ready = client.post("/api/internal/agent-dispatch/mcp", headers={"Authorization":"Bearer " + grant.json()["access_token"]}, json={
            "jsonrpc":"2.0","id":2,"method":"tools/call",
            "params":{"name":"get_twin_cursor_readiness","arguments":{}},
        })
        assert ready.status_code == 200 and not ready.json()["result"]["isError"]
        body = json.loads(ready.json()["result"]["content"][0]["text"])
        assert body["launches_agent"] is False and body["remote_connection_verified"] is False
        blocked = client.post("/api/internal/agent-dispatch/runs", headers={"Authorization":"Bearer " + settings.agent_dispatch_token}, json={
            "task_name":"ci-container-blocked","prompt":"Verify cost interlock only",
            "repository":"https://github.com/CzechowskiT/twin",
            "base_branch":"cursor/phase1-monorepo-scaffold","dispatch_now":False,
        })
        assert blocked.status_code == 403 and blocked.json()["detail"]["error"] == "founder_cost_approval_required"
    print("Container HTTP health, OAuth read scope, readiness and cost interlock: PASS")
else:
    raise ValueError("Expected db or http mode")
