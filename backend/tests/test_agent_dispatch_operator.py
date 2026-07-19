"""Operator Service tests: gates, verified artifacts, failures, and recovery."""

from __future__ import annotations

import json
import hashlib
from datetime import datetime, timedelta, timezone

import httpx
import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import get_settings
from app.database.models import (
    AgentDispatchLock,
    AgentDispatchOperatorOperation,
    AgentDispatchRun,
    Base,
)
from app.services.agent_dispatch.constants import DEFAULT_EXECUTION_POLICY
from app.services.agent_dispatch.operator_github import (
    GitHubOperatorClient,
    OperatorGitHubError,
    PullRequestState,
)
from app.services.agent_dispatch.operator_service import (
    OperatorService,
    recover_operator_runs,
)
from app.services.agent_dispatch.auth import AgentDispatchPrincipal
from app.services.agent_dispatch.service import cancel_run


@pytest.fixture
def operator_db(monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "operator-test-secret-key-at-least-32-chars")
    monkeypatch.setenv("AGENT_DISPATCH_GITHUB_TOKEN", "test-github-token")
    monkeypatch.setenv("AGENT_DISPATCH_OPERATOR_ENABLED", "true")
    monkeypatch.setenv("AGENT_DISPATCH_OPERATOR_TIMEOUT_SECONDS", "2")
    monkeypatch.setenv("AGENT_DISPATCH_OPERATOR_POLL_SECONDS", "1")
    monkeypatch.setenv("AGENT_DISPATCH_OPERATOR_MAX_RETRIES", "3")
    monkeypatch.setenv("AGENT_DISPATCH_OPERATOR_NON_BYPASS_IDENTITY", "true")
    monkeypatch.setenv(
        "AGENT_DISPATCH_OPERATOR_REGRESSION_WORKFLOW",
        "production-regression.yml",
    )
    get_settings.cache_clear()
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    db = sessionmaker(bind=engine, expire_on_commit=False)()
    yield db, get_settings()
    db.close()
    get_settings.cache_clear()


class FakeGitHub:
    def __init__(self):
        self.create_calls = 0
        self.merge_calls = 0
        self.check_calls = 0
        self.deployment_calls = 0
        self.regression_dispatches = 0
        self.regression_checks = 0
        self.merged = False
        self.merge_failures = 0
        self.checks_pass = True
        self.deployment: dict | None = {"id": 7, "sha": "merge-sha"}
        self.regression_pass = True
        self.head_sha = "head-sha"

    def _pr(self) -> PullRequestState:
        return PullRequestState(
            number=42,
            url="https://github.com/CzechowskiT/twin/pull/42",
            state="closed" if self.merged else "open",
            draft=False,
            mergeable=True,
            head_ref="feat/operator",
            head_sha=self.head_sha,
            base_ref="cursor/phase1-monorepo-scaffold",
            merged=self.merged,
            merge_sha="merge-sha" if self.merged else None,
        )

    def create_pull_request(self, **kwargs):
        self.create_calls += 1
        return self._pr()

    def get_pull_request(self, repository_url, pr_url):
        return self._pr()

    def verify_mergeability(self, **kwargs):
        if self.head_sha != "head-sha":
            return self._pr()
        return self._pr()

    def required_checks_passed(self, **kwargs):
        self.check_calls += 1
        return self.checks_pass

    def execute_standard_merge(self, **kwargs):
        self.merge_calls += 1
        if self.merge_failures:
            self.merge_failures -= 1
            raise OperatorGitHubError("operator_github_retryable", retryable=True)
        self.merged = True
        return "merge-sha"

    def verify_commit(self, repository_url, sha):
        return sha == "merge-sha"

    def deployment_for_sha(self, **kwargs):
        self.deployment_calls += 1
        return self.deployment

    def trigger_regression(self, **kwargs):
        self.regression_dispatches += 1
        return {
            "workflow_run_id": 9001,
            "triggered_at": datetime.now(timezone.utc).isoformat(),
        }

    def regression_passed(self, **kwargs):
        self.regression_checks += 1
        return self.regression_pass


def _run(
    db,
    *,
    expected: dict[str, bool] | None = None,
    verified: dict[str, bool] | None = None,
    status: str = "awaiting_result",
    base_branch: str = "cursor/phase1-monorepo-scaffold",
) -> AgentDispatchRun:
    expected_base = {
        "pr_required": True,
        "merge_required": True,
        "deployment_required": True,
        "ci_required": True,
        "regression_required": True,
        "commit_required": True,
        "read_only": False,
    }
    expected_base.update(expected or {})
    verified_base = {
        "pr_exists": True,
        "merge_verified": False,
        "deployment_verified": False,
        "ci_passed": True,
        "regression_passed": False,
        "commit_exists": True,
        "head_sha_verified": True,
    }
    verified_base.update(verified or {})
    run = AgentDispatchRun(
        id="run-" + str(db.query(AgentDispatchRun).count() + 1),
        status=status,
        task_name="Operator test",
        repository_url="https://github.com/CzechowskiT/twin",
        base_branch=base_branch,
        execution_policy_json=json.dumps(DEFAULT_EXECUTION_POLICY),
        prompt_envelope_version="test/v1",
        prompt_hash="a" * 64,
        result_branch="feat/operator",
        result_pr_url="https://github.com/CzechowskiT/twin/pull/42",
        result_head_sha="head-sha",
        expected_artifacts_json=json.dumps(expected_base),
        verified_artifacts_json=json.dumps(verified_base),
    )
    db.add(run)
    db.flush()
    db.add(
        AgentDispatchLock(
            repo_url=run.repository_url,
            base_branch=run.base_branch,
            run_id=run.id,
            holder_fingerprint="test",
            lease_expires_at=datetime.utcnow() + timedelta(minutes=10),
        )
    )
    db.commit()
    return run


def test_operator_happy_path_verifies_every_artifact(operator_db):
    db, settings = operator_db
    run = _run(db)
    github = FakeGitHub()

    result = OperatorService(db, settings, github=github, sleeper=lambda _: None).run(
        run.id,
        correlation_id="correlation-happy",
    )

    assert result.status == "succeeded"
    verified = json.loads(result.verified_artifacts_json)
    assert verified["merge_verified"] is True
    assert verified["deployment_verified"] is True
    assert verified["regression_passed"] is True
    assert github.merge_calls == github.regression_dispatches == 1
    assert db.query(AgentDispatchLock).count() == 0
    operations = db.execute(
        select(AgentDispatchOperatorOperation).where(
            AgentDispatchOperatorOperation.run_id == run.id
        )
    ).scalars()
    names = {row.operation for row in operations}
    assert {
        "verify_mergeability",
        "wait_for_required_checks",
        "execute_standard_merge",
        "verify_merge_sha",
        "wait_for_deployment",
        "verify_deployment_sha",
        "run_production_regression",
        "finalize_report",
    } <= names


def test_create_pr_is_idempotent(operator_db):
    db, settings = operator_db
    run = _run(db, expected={"merge_required": False}, status="awaiting_result")
    run.result_pr_url = None
    db.commit()
    github = FakeGitHub()
    service = OperatorService(db, settings, github=github, sleeper=lambda _: None)

    first = service.create_pull_request(run.id, title="Operator PR")
    second = service.create_pull_request(run.id, title="Operator PR")

    assert first == second
    assert github.create_calls == 1
    assert run.result_pr_url.endswith("/42")


def test_handoff_requires_verified_ci_and_does_not_merge(operator_db):
    db, settings = operator_db
    run = _run(db, verified={"ci_passed": False})
    github = FakeGitHub()

    result = OperatorService(db, settings, github=github, sleeper=lambda _: None).run(run.id)

    assert result.status == "needs_attention"
    assert result.error_code == "operator_handoff_gate_failed"
    assert github.merge_calls == 0
    assert json.loads(result.verified_artifacts_json)["merge_verified"] is False


def test_head_sha_race_fails_closed(operator_db):
    db, settings = operator_db
    run = _run(db)
    github = FakeGitHub()
    github.head_sha = "changed-head"

    result = OperatorService(db, settings, github=github, sleeper=lambda _: None).run(run.id)

    assert result.status == "needs_attention"
    assert result.error_code == "operator_head_sha_changed"
    assert github.merge_calls == 0


def test_merge_retries_and_operation_is_idempotent(operator_db):
    db, settings = operator_db
    run = _run(db, status="waiting_for_operator")
    github = FakeGitHub()
    github.merge_failures = 2
    service = OperatorService(db, settings, github=github, sleeper=lambda _: None)
    run.status = "merging"
    db.commit()

    merge_sha = service.execute_standard_merge(run.id)
    again = service.execute_standard_merge(run.id)

    assert merge_sha == again == "merge-sha"
    assert github.merge_calls == 3
    operation = db.execute(
        select(AgentDispatchOperatorOperation).where(
            AgentDispatchOperatorOperation.operation == "execute_standard_merge"
        )
    ).scalar_one()
    assert operation.attempt_count == 1


def test_required_checks_timeout_rolls_back_to_attention(operator_db):
    db, settings = operator_db
    run = _run(db)
    github = FakeGitHub()
    github.checks_pass = False

    result = OperatorService(db, settings, github=github, sleeper=lambda _: None).run(run.id)

    assert result.status == "needs_attention"
    assert result.error_code == "operator_checks_timeout"
    assert github.merge_calls == 0
    assert db.query(AgentDispatchLock).count() == 0


def test_deployment_sha_mismatch_never_sets_verified(operator_db):
    db, settings = operator_db
    run = _run(db)
    github = FakeGitHub()
    github.deployment = {"id": 7, "sha": "wrong-sha"}

    result = OperatorService(db, settings, github=github, sleeper=lambda _: None).run(run.id)

    assert result.status == "needs_attention"
    assert result.error_code == "operator_deployment_sha_mismatch"
    assert json.loads(result.verified_artifacts_json)["deployment_verified"] is False


def test_regression_timeout_is_not_reported_as_pass(operator_db):
    db, settings = operator_db
    run = _run(db)
    github = FakeGitHub()
    github.regression_pass = False

    result = OperatorService(db, settings, github=github, sleeper=lambda _: None).run(run.id)

    assert result.status == "needs_attention"
    assert result.error_code == "operator_regression_timeout"
    assert json.loads(result.verified_artifacts_json)["regression_passed"] is False
    assert github.regression_dispatches == 1


def test_retry_after_post_merge_timeout_resumes_deployment(operator_db):
    db, settings = operator_db
    run = _run(db)
    github = FakeGitHub()
    github.deployment = None
    service = OperatorService(db, settings, github=github, sleeper=lambda _: None)

    failed = service.run(run.id)
    assert failed.status == "needs_attention"
    assert failed.error_code == "operator_deployment_timeout"
    assert json.loads(failed.verified_artifacts_json)["merge_verified"] is True

    github.deployment = {"id": 7, "sha": "merge-sha"}
    recovered = service.run(run.id)
    assert recovered.status == "succeeded"
    assert github.merge_calls == 1
    assert github.regression_dispatches == 1


def test_started_operation_rejects_concurrent_execution(operator_db):
    db, settings = operator_db
    run = _run(db, status="merging")
    digest = hashlib.sha256(b"head-sha").hexdigest()
    db.add(
        AgentDispatchOperatorOperation(
            run_id=run.id,
            operation="execute_standard_merge",
            idempotency_key=digest,
            correlation_id="concurrent-owner",
            owner_token="other-worker",
            lease_expires_at=datetime.utcnow() + timedelta(minutes=2),
            status="started",
            attempt_count=1,
        )
    )
    db.commit()
    github = FakeGitHub()

    with pytest.raises(OperatorGitHubError) as exc:
        OperatorService(db, settings, github=github).execute_standard_merge(run.id)

    assert exc.value.reason_code == "operator_operation_in_progress"
    assert github.merge_calls == 0


def test_recovery_resumes_deployment_without_merging_again(operator_db, monkeypatch):
    db, settings = operator_db
    run = _run(db, status="deploying", verified={"merge_verified": True})
    run.operator_artifacts_json = json.dumps({"merge_sha": "merge-sha"})
    db.commit()
    github = FakeGitHub()
    monkeypatch.setattr(
        "app.services.agent_dispatch.operator_service.GitHubOperatorClient",
        lambda settings, sleeper=None: github,
    )

    recovered = recover_operator_runs(db, settings)

    assert recovered == {"recovered": 1}
    assert db.get(AgentDispatchRun, run.id).status == "succeeded"
    assert github.merge_calls == 0


def test_recovery_resumes_explicitly_requested_waiting_run(operator_db, monkeypatch):
    db, settings = operator_db
    run = _run(db, status="waiting_for_operator")
    run.operator_requested_at = datetime.utcnow()
    run.operator_requested_by = "admin-fingerprint"
    db.commit()
    github = FakeGitHub()
    monkeypatch.setattr(
        "app.services.agent_dispatch.operator_service.GitHubOperatorClient",
        lambda settings, sleeper=None: github,
    )

    recovered = recover_operator_runs(db, settings)

    assert recovered == {"recovered": 1}
    assert db.get(AgentDispatchRun, run.id).status == "succeeded"
    assert github.merge_calls == 1


def test_regression_crash_window_recovers_idempotent_dispatch(operator_db):
    db, settings = operator_db
    run = _run(
        db,
        status="regression",
        verified={"merge_verified": True, "deployment_verified": True},
    )
    run.operator_artifacts_json = json.dumps(
        {
            "merge_sha": "merge-sha",
            "regression_intent": {
                "workflow": "production-regression.yml",
                "requested_at": datetime.now(timezone.utc).isoformat(),
            },
        }
    )
    db.commit()
    github = FakeGitHub()

    result = OperatorService(db, settings, github=github).run(run.id)

    assert result.status == "succeeded"
    assert github.regression_dispatches == 1
    assert json.loads(result.verified_artifacts_json)["regression_passed"] is True


def test_finalize_blocks_other_active_run_and_lock(operator_db):
    db, settings = operator_db
    run = _run(
        db,
        status="finalizing",
        verified={
            "merge_verified": True,
            "deployment_verified": True,
            "regression_passed": True,
        },
    )
    _run(db, status="running", base_branch="other-base")
    service = OperatorService(db, settings, github=FakeGitHub(), sleeper=lambda _: None)

    result = service.run(run.id)

    assert result.status == "needs_attention"
    assert result.error_code == "operator_active_runs_nonzero"


def test_cancel_rejects_inflight_operator_stage(operator_db):
    db, settings = operator_db
    run = _run(db, status="merging")
    principal = AgentDispatchPrincipal("admin-fingerprint", frozenset())

    with pytest.raises(HTTPException) as exc:
        cancel_run(db, settings, principal, run.id)

    assert getattr(exc.value, "status_code", None) == 409
    assert db.get(AgentDispatchRun, run.id).status == "merging"


def test_missing_operator_capability_is_not_simulated(operator_db, monkeypatch):
    db, _ = operator_db
    run = _run(db)
    monkeypatch.setenv("AGENT_DISPATCH_OPERATOR_ENABLED", "false")
    get_settings.cache_clear()

    result = OperatorService(
        db,
        get_settings(),
        github=FakeGitHub(),
        sleeper=lambda _: None,
    ).run(run.id)

    assert result.status == "needs_attention"
    assert result.error_code == "operator_capability_missing"
    assert json.loads(result.verified_artifacts_json)["merge_verified"] is False


def test_standard_merge_respects_branch_protection_payload(operator_db):
    _, settings = operator_db
    captured: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["method"] = request.method
        captured["body"] = json.loads(request.content)
        return httpx.Response(405, json={"message": "Required checks are pending"})

    client = GitHubOperatorClient(
        settings,
        transport=httpx.MockTransport(handler),
        sleeper=lambda _: None,
    )
    with pytest.raises(OperatorGitHubError) as exc:
        client.execute_standard_merge(
            repository_url="https://github.com/CzechowskiT/twin",
            pr_url="https://github.com/CzechowskiT/twin/pull/42",
            expected_head_sha="head-sha",
            commit_title="Operator test",
        )

    assert exc.value.reason_code == "operator_merge_rejected"
    assert captured["method"] == "PUT"
    assert captured["body"] == {
        "commit_title": "Operator test",
        "sha": "head-sha",
        "merge_method": "merge",
    }
    assert "auto_merge" not in captured["body"]


def test_operator_rejects_non_github_repository(operator_db):
    _, settings = operator_db
    client = GitHubOperatorClient(settings)

    with pytest.raises(OperatorGitHubError) as exc:
        client.verify_commit("https://evil.example/CzechowskiT/twin", "abc")

    assert exc.value.reason_code == "operator_repository_invalid"


def test_transport_failure_has_retryable_reason(operator_db):
    _, settings = operator_db

    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("offline", request=request)

    client = GitHubOperatorClient(settings, transport=httpx.MockTransport(handler))
    with pytest.raises(OperatorGitHubError) as exc:
        client.verify_commit("https://github.com/CzechowskiT/twin", "abc")

    assert exc.value.reason_code == "operator_github_retryable"
    assert exc.value.retryable is True


def test_regression_dispatch_uses_official_response_contract(operator_db):
    _, settings = operator_db
    captured: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["version"] = request.headers["X-GitHub-Api-Version"]
        if request.method == "GET":
            return httpx.Response(200, json={"workflow_runs": []})
        captured["body"] = json.loads(request.content)
        return httpx.Response(
            200,
            json={"workflow_run_id": 91, "html_url": "https://github.com/run/91"},
        )

    client = GitHubOperatorClient(settings, transport=httpx.MockTransport(handler))
    result = client.trigger_regression(
        repository_url="https://github.com/CzechowskiT/twin",
        workflow="operator-service.yml",
        ref="cursor/phase1-monorepo-scaffold",
        sha="a" * 40,
    )

    assert result["workflow_run_id"] == 91
    assert captured["version"] == "2026-03-10"
    assert captured["body"]["inputs"]["expected_sha"] == "a" * 40
    assert "return_run_details" not in captured["body"]


def test_workflow_merge_reuses_successful_run_without_second_dispatch(operator_db):
    _, settings = operator_db
    settings.agent_dispatch_operator_mutation_workflow = "operator-service.yml"
    calls: list[tuple[str, str]] = []
    title = "operator-merge-pr-42-" + ("a" * 40)

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append((request.method, request.url.path))
        if request.url.path.endswith("/runs"):
            return httpx.Response(
                200,
                json={"workflow_runs": [{"id": 91, "display_title": title, "conclusion": "success"}]},
            )
        if request.url.path.endswith("/actions/runs/91"):
            return httpx.Response(200, json={"status": "completed", "conclusion": "success"})
        return httpx.Response(
            200,
            json={
                "number": 42,
                "html_url": "https://github.com/CzechowskiT/twin/pull/42",
                "state": "closed",
                "draft": False,
                "mergeable": True,
                "head": {"ref": "feat/operator", "sha": "a" * 40},
                "base": {"ref": "cursor/phase1-monorepo-scaffold"},
                "merged": True,
                "merge_commit_sha": "b" * 40,
            },
        )

    client = GitHubOperatorClient(settings, transport=httpx.MockTransport(handler))
    merge_sha = client.execute_standard_merge(
        repository_url="https://github.com/CzechowskiT/twin",
        pr_url="https://github.com/CzechowskiT/twin/pull/42",
        expected_head_sha="a" * 40,
        commit_title="Operator test",
    )

    assert merge_sha == "b" * 40
    assert not any(method in {"POST", "PUT"} for method, _ in calls)


def test_github_app_mints_unscoped_installation_token(operator_db, monkeypatch):
    """Installation token mint must not narrow repositories/permissions below the install."""
    _, settings = operator_db
    settings.agent_dispatch_github_token = ""
    settings.agent_dispatch_github_app_client_id = "Iv1.test"
    settings.agent_dispatch_github_app_installation_id = "77"
    settings.agent_dispatch_github_app_private_key = "test-private-key"
    settings.agent_dispatch_operator_mutation_workflow = "operator-service.yml"
    captured: dict = {}
    monkeypatch.setattr(
        "app.services.agent_dispatch.operator_github.jwt.encode",
        lambda *args, **kwargs: "signed-app-jwt",
    )

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/access_tokens"):
            captured["mint"] = json.loads(request.content or b"{}")
            captured["mint_auth"] = request.headers["Authorization"]
            return httpx.Response(
                201,
                json={
                    "token": "installation-token",
                    "permissions": {
                        "actions": "write",
                        "contents": "write",
                        "deployments": "read",
                        "metadata": "read",
                        "pull_requests": "write",
                    },
                },
            )
        captured["authorization"] = request.headers["Authorization"]
        return httpx.Response(200, json={"sha": "a" * 40})

    client = GitHubOperatorClient(settings, transport=httpx.MockTransport(handler))
    assert client.verify_commit(
        "https://github.com/CzechowskiT/twin",
        "a" * 40,
    )
    assert captured["mint"] == {}
    assert "repositories" not in captured["mint"]
    assert "permissions" not in captured["mint"]
    assert captured["mint_auth"] == "Bearer signed-app-jwt"
    assert captured["authorization"] == "Bearer installation-token"


def test_github_app_installation_diagnostic_covers_required_capabilities(
    operator_db, monkeypatch
):
    """Safe diagnostic (no secrets): app, install, JWT, mint, perms, repo/workflows/PRs read."""
    _, settings = operator_db
    settings.agent_dispatch_github_token = ""
    settings.agent_dispatch_github_app_client_id = "Iv1.test-app"
    settings.agent_dispatch_github_app_installation_id = "99001"
    settings.agent_dispatch_github_app_private_key = "test-private-key"
    settings.agent_dispatch_repo_allowlist = "CzechowskiT/twin"
    settings.agent_dispatch_operator_mutation_workflow = "operator-service.yml"
    jwt_calls: list[dict] = []
    monkeypatch.setattr(
        "app.services.agent_dispatch.operator_github.jwt.encode",
        lambda payload, key, algorithm: (
            jwt_calls.append({"payload": payload, "algorithm": algorithm, "key_set": bool(key)})
            or "signed-app-jwt"
        ),
    )

    def handler(request: httpx.Request) -> httpx.Response:
        path = request.url.path
        auth = request.headers.get("Authorization", "")
        if path == "/app":
            assert auth == "Bearer signed-app-jwt"
            return httpx.Response(200, json={"id": 42, "slug": "twin-operator"})
        if path == "/app/installations/99001":
            assert auth == "Bearer signed-app-jwt"
            return httpx.Response(200, json={"id": 99001, "app_id": 42})
        if path.endswith("/access_tokens"):
            assert auth == "Bearer signed-app-jwt"
            assert json.loads(request.content or b"{}") == {}
            return httpx.Response(
                201,
                json={
                    "token": "installation-token",
                    "permissions": {
                        "actions": "write",
                        "checks": "read",
                        "contents": "write",
                        "deployments": "read",
                        "metadata": "read",
                        "pull_requests": "write",
                        "statuses": "read",
                    },
                },
            )
        assert auth == "Bearer installation-token"
        if path == "/repos/CzechowskiT/twin":
            return httpx.Response(200, json={"full_name": "CzechowskiT/twin"})
        if path == "/repos/CzechowskiT/twin/actions/workflows":
            return httpx.Response(200, json={"total_count": 3, "workflows": []})
        if path == "/repos/CzechowskiT/twin/pulls":
            return httpx.Response(200, json=[{"number": 1}])
        if path.endswith("/actions/workflows/operator-service.yml"):
            return httpx.Response(
                200,
                json={"id": 315889248, "path": ".github/workflows/operator-service.yml"},
            )
        return httpx.Response(404, json={"message": "unexpected path"})

    client = GitHubOperatorClient(settings, transport=httpx.MockTransport(handler))
    result = client.diagnose_installation()

    assert result["ok"] is True
    assert result["app_id"] == 42
    assert result["app_slug"] == "twin-operator"
    assert result["installation_id"] == 99001
    assert result["jwt_generated"] is True
    assert result["installation_token_minted"] is True
    assert result["token_permissions"]["actions"] == "write"
    assert result["token_permissions"]["pull_requests"] == "write"
    assert result["repo_read"] is True
    assert result["workflows_read"] is True
    assert result["pull_requests_read"] is True
    assert result["actions_write_capable"] is True
    assert result["mint_request_unscoped"] is True
    assert "token" not in result
    assert jwt_calls and jwt_calls[0]["payload"]["iss"] == "Iv1.test-app"
    assert jwt_calls[0]["algorithm"] == "RS256"
