"""Explicit Operator workflow for verified GitHub mutations and release gates."""

from __future__ import annotations

import hashlib
import json
import time
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Callable

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select, update
from sqlalchemy.orm import Session

from app.config import Settings
from app.database.models import (
    AgentDispatchLock,
    AgentDispatchOperatorOperation,
    AgentDispatchRun,
)
from app.services.agent_dispatch.artifacts import normalize_expected, normalize_verified, sha_matches
from app.services.agent_dispatch.audit import write_audit
from app.services.agent_dispatch.constants import (
    ACTIVE_LOCK_STATUSES,
    DEFAULT_EXECUTION_POLICY,
    DISPATCH_RUN_TERMINAL,
    OPERATOR_RUN_STATUSES,
    DispatchRunStatus,
)
from app.services.agent_dispatch.locking import release_lock
from app.services.agent_dispatch.locking import (
    LockConflictError,
    acquire_lock,
)
from app.services.agent_dispatch.operator_github import (
    GitHubOperatorClient,
    OperatorGitHubError,
    PullRequestState,
)
from app.services.agent_dispatch.operator_observability import trace_operator_stage


def _utcnow() -> datetime:
    """Return naive UTC for compatibility with existing DateTime columns."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class OperatorService:
    """Restart-safe stage runner. Invocation is explicit; auto-merge is never enabled."""

    def __init__(
        self,
        db: Session,
        settings: Settings,
        *,
        github: GitHubOperatorClient | None = None,
        sleeper: Callable[[float], None] = time.sleep,
        actor_fingerprint: str = "operator",
        recovery: bool = False,
    ):
        self.db = db
        self.settings = settings
        self.github = github or GitHubOperatorClient(settings, sleeper=sleeper)
        self.sleeper = sleeper
        self.actor_fingerprint = actor_fingerprint
        self.recovery = recovery
        self.owner_token = str(uuid.uuid4())
        self._current_operation: AgentDispatchOperatorOperation | None = None

    def create_pull_request(
        self,
        run_id: str,
        *,
        title: str,
        body: str = "",
        correlation_id: str | None = None,
    ) -> dict[str, Any]:
        run = self._run(run_id)
        self._assert_create_pr_policy(run)
        if not run.result_branch:
            raise OperatorGitHubError("operator_branch_missing")
        correlation = self._correlation(run, correlation_id)
        artifact = self._perform(
            run,
            "create_pull_request",
            run.result_branch,
            correlation,
            lambda: self._create_pr_artifact(run, title, body),
        )
        run.result_pr_url = str(artifact["pr_url"])
        self.db.commit()
        return artifact

    def verify_mergeability(
        self,
        run_id: str,
        *,
        correlation_id: str | None = None,
    ) -> PullRequestState:
        run = self._run(run_id)
        correlation = self._correlation(run, correlation_id)
        pr = self._require_pr(run)
        artifact = self._perform(
            run,
            "verify_mergeability",
            pr,
            correlation,
            lambda: self._mergeability_artifact(run),
        )
        return PullRequestState(**artifact)

    def wait_for_required_checks(
        self,
        run_id: str,
        *,
        correlation_id: str | None = None,
    ) -> bool:
        run = self._run(run_id)
        correlation = self._correlation(run, correlation_id)
        sha = self._require_head_sha(run)
        artifact = self._perform(
            run,
            "wait_for_required_checks",
            sha,
            correlation,
            lambda: {"passed": self._wait_checks(run, sha)},
        )
        if artifact.get("passed") is not True:
            raise OperatorGitHubError("operator_checks_timeout")
        self._set_verified(run, ci_passed=True)
        return True

    def execute_standard_merge(
        self,
        run_id: str,
        *,
        correlation_id: str | None = None,
    ) -> str:
        run = self._run(run_id)
        self._assert_merge_gate(run)
        correlation = self._correlation(run, correlation_id)
        head_sha = self._require_head_sha(run)
        artifact = self._perform(
            run,
            "execute_standard_merge",
            head_sha,
            correlation,
            lambda: {"merge_sha": self._merge_or_recover(run, head_sha)},
        )
        merge_sha = str(artifact["merge_sha"])
        self._save_artifacts(run, merge_sha=merge_sha)
        return merge_sha

    def verify_merge_sha(
        self,
        run_id: str,
        *,
        correlation_id: str | None = None,
    ) -> bool:
        run = self._run(run_id)
        self._assert_operator_enabled()
        correlation = self._correlation(run, correlation_id)
        merge_sha = self._artifact_string(run, "merge_sha")
        artifact = self._perform(
            run,
            "verify_merge_sha",
            merge_sha,
            correlation,
            lambda: {"verified": self.github.verify_commit(run.repository_url, merge_sha)},
        )
        if artifact.get("verified") is not True:
            raise OperatorGitHubError("operator_merge_sha_unverified")
        self._set_verified(run, merge_verified=True)
        return True

    def wait_for_deployment(
        self,
        run_id: str,
        *,
        correlation_id: str | None = None,
    ) -> dict[str, Any]:
        run = self._run(run_id)
        correlation = self._correlation(run, correlation_id)
        merge_sha = self._artifact_string(run, "merge_sha")
        artifact = self._perform(
            run,
            "wait_for_deployment",
            merge_sha,
            correlation,
            lambda: self._wait_deployment(run, merge_sha),
        )
        self._save_artifacts(run, deployment=artifact)
        return artifact

    def verify_deployment_sha(
        self,
        run_id: str,
        *,
        correlation_id: str | None = None,
    ) -> bool:
        run = self._run(run_id)
        correlation = self._correlation(run, correlation_id)
        merge_sha = self._artifact_string(run, "merge_sha")
        deployment = self._artifacts(run).get("deployment") or {}
        artifact = self._perform(
            run,
            "verify_deployment_sha",
            merge_sha,
            correlation,
            lambda: {"verified": sha_matches(str(deployment.get("sha") or ""), merge_sha)},
        )
        if artifact.get("verified") is not True:
            raise OperatorGitHubError("operator_deployment_sha_mismatch")
        self._set_verified(run, deployment_verified=True)
        return True

    def run_production_regression(
        self,
        run_id: str,
        *,
        correlation_id: str | None = None,
    ) -> bool:
        run = self._run(run_id)
        correlation = self._correlation(run, correlation_id)
        merge_sha = self._artifact_string(run, "merge_sha")
        artifact = self._perform(
            run,
            "run_production_regression",
            merge_sha,
            correlation,
            lambda: {"passed": self._trigger_and_wait_regression(run, merge_sha)},
        )
        if artifact.get("passed") is not True:
            raise OperatorGitHubError("operator_regression_timeout")
        self._set_verified(run, regression_passed=True)
        return True

    def verify_active_runs_zero(self, run_id: str) -> bool:
        count = int(
            self.db.execute(
                select(func.count())
                .select_from(AgentDispatchRun)
                .where(
                    AgentDispatchRun.status.in_(list(ACTIVE_LOCK_STATUSES)),
                    AgentDispatchRun.id != run_id,
                )
            ).scalar()
            or 0
        )
        if count:
            raise OperatorGitHubError("operator_active_runs_nonzero", retryable=True)
        return True

    def verify_active_locks_zero(self, run_id: str) -> bool:
        count = int(
            self.db.execute(
                select(func.count())
                .select_from(AgentDispatchLock)
                .where(AgentDispatchLock.run_id != run_id)
            ).scalar()
            or 0
        )
        if count:
            raise OperatorGitHubError("operator_active_locks_nonzero", retryable=True)
        return True

    def finalize_report(
        self,
        run_id: str,
        *,
        correlation_id: str | None = None,
    ) -> AgentDispatchRun:
        run = self._run(run_id)
        correlation = self._correlation(run, correlation_id)

        def finalize() -> dict[str, Any]:
            release_lock(self.db, run_id=run.id)
            self.db.flush()
            self.verify_active_runs_zero(run.id)
            self.verify_active_locks_zero(run.id)
            self._assert_expected_verified(run)
            return {"active_runs": 0, "active_locks": 0}

        self._perform(run, "finalize_report", run.id, correlation, finalize)
        run.status = DispatchRunStatus.SUCCEEDED.value
        run.error_code = None
        run.error_message = None
        run.finished_at = _utcnow()
        run.operator_updated_at = _utcnow()
        self.db.commit()
        self.db.refresh(run)
        return run

    def handoff(self, run_id: str, *, correlation_id: str | None = None) -> AgentDispatchRun:
        run = self._run(run_id)
        if run.status in self._operator_states():
            return run
        self._assert_handoff_policy(run)
        correlation = self._correlation(run, correlation_id)
        self._ensure_lock(run)
        self.verify_mergeability(run.id, correlation_id=correlation)
        self._transition(run, DispatchRunStatus.WAITING_FOR_OPERATOR)
        self._audit(run, "operator_handoff", correlation, {})
        self.db.commit()
        self.db.refresh(run)
        return run

    def request(
        self,
        run_id: str,
        *,
        correlation_id: str | None = None,
    ) -> AgentDispatchRun:
        """Persist explicit authorization before a durable task is published."""
        self._assert_handoff_policy(self._run(run_id))
        run = self.handoff(run_id, correlation_id=correlation_id)
        run.operator_requested_at = _utcnow()
        run.operator_requested_by = self.actor_fingerprint
        run.operator_updated_at = _utcnow()
        self.db.commit()
        self.db.refresh(run)
        return run

    def run(self, run_id: str, *, correlation_id: str | None = None) -> AgentDispatchRun:
        run = self._run(run_id)
        if run.status == DispatchRunStatus.SUCCEEDED.value:
            return run
        correlation = self._correlation(run, correlation_id)
        try:
            if run.status == DispatchRunStatus.NEEDS_ATTENTION.value:
                self._resume_after_failure(run)
            else:
                run = self.handoff(run.id, correlation_id=correlation)
            if run.status in {
                DispatchRunStatus.WAITING_FOR_OPERATOR.value,
                DispatchRunStatus.MERGING.value,
            }:
                self._merge_stage(run, correlation)
            if run.status == DispatchRunStatus.DEPLOYING.value:
                self._deployment_stage(run, correlation)
            if run.status == DispatchRunStatus.REGRESSION.value:
                self._regression_stage(run, correlation)
            if run.status == DispatchRunStatus.FINALIZING.value:
                return self.finalize_report(run.id, correlation_id=correlation)
            return self._run(run.id)
        except OperatorGitHubError as exc:
            self.db.refresh(run)
            if exc.reason_code in {
                "operator_operation_in_progress",
                "operator_operation_lease_lost",
                "operator_state_changed",
            }:
                return run
            if run.status in DISPATCH_RUN_TERMINAL:
                return run
            if run.status == DispatchRunStatus.CANCELLING.value:
                return run
            return self._fail(run, exc.reason_code, correlation)
        except Exception:
            return self._fail(run, "operator_unexpected_failure", correlation)

    def _merge_stage(self, run: AgentDispatchRun, correlation: str) -> None:
        self._state(run, DispatchRunStatus.MERGING)
        if not self._artifacts(run).get("merge_sha"):
            self.verify_mergeability(run.id, correlation_id=correlation)
            self.wait_for_required_checks(run.id, correlation_id=correlation)
            self.execute_standard_merge(run.id, correlation_id=correlation)
        self.verify_merge_sha(run.id, correlation_id=correlation)
        self._state(run, DispatchRunStatus.DEPLOYING)

    def _deployment_stage(self, run: AgentDispatchRun, correlation: str) -> None:
        expected = self._expected(run)
        if expected["deployment_required"]:
            self.wait_for_deployment(run.id, correlation_id=correlation)
            self.verify_deployment_sha(run.id, correlation_id=correlation)
        self._state(run, DispatchRunStatus.REGRESSION)

    def _regression_stage(self, run: AgentDispatchRun, correlation: str) -> None:
        if self._expected(run)["regression_required"]:
            self.run_production_regression(run.id, correlation_id=correlation)
        self._state(run, DispatchRunStatus.FINALIZING)

    def _perform(
        self,
        run: AgentDispatchRun,
        operation: str,
        key: str,
        correlation: str,
        action: Callable[[], dict[str, Any]],
    ) -> dict[str, Any]:
        row = self._claim_operation(run, operation, key, correlation)
        if row.status == "completed":
            return json.loads(row.artifact_json or "{}")
        self._current_operation = row
        try:
            with trace_operator_stage(
                operation=operation,
                run_id=run.id,
                correlation_id=correlation,
            ):
                artifact = self._retry(lambda: self._owned_action(run, action))
        except Exception as exc:
            reason = getattr(exc, "reason_code", "operator_stage_failed")
            self._finish_operation(row, status_value="failed", error_code=reason)
            self._audit(run, "operator_stage_failed", correlation, {"operation": operation})
            self.db.commit()
            raise
        finally:
            self._current_operation = None
        self._finish_operation(
            row,
            status_value="completed",
            artifact=artifact,
        )
        self._audit(run, "operator_stage_completed", correlation, {"operation": operation})
        self.db.commit()
        return artifact

    def _finish_operation(
        self,
        row: AgentDispatchOperatorOperation,
        *,
        status_value: str,
        artifact: dict[str, Any] | None = None,
        error_code: str | None = None,
    ) -> None:
        result = self.db.execute(
            update(AgentDispatchOperatorOperation)
            .where(
                AgentDispatchOperatorOperation.id == row.id,
                AgentDispatchOperatorOperation.owner_token == self.owner_token,
                AgentDispatchOperatorOperation.status == "started",
            )
            .values(
                status=status_value,
                artifact_json=(
                    json.dumps(artifact, default=str, sort_keys=True)
                    if artifact is not None
                    else None
                ),
                error_code=error_code,
                finished_at=_utcnow(),
                owner_token=None,
                lease_expires_at=None,
            )
        )
        if result.rowcount != 1:
            self.db.rollback()
            raise OperatorGitHubError("operator_operation_lease_lost")

    def _owned_action(
        self,
        run: AgentDispatchRun,
        action: Callable[[], dict[str, Any]],
    ) -> dict[str, Any]:
        self._ensure_lock(run)
        return action()

    def _retry(self, action: Callable[[], dict[str, Any]]) -> dict[str, Any]:
        retries = max(1, int(self.settings.agent_dispatch_operator_max_retries or 1))
        for attempt in range(retries):
            try:
                return action()
            except OperatorGitHubError as exc:
                if not exc.retryable or attempt + 1 >= retries:
                    raise
                self.sleeper(self._poll_seconds())
        raise OperatorGitHubError("operator_retry_exhausted")

    def _wait_checks(self, run: AgentDispatchRun, sha: str) -> bool:
        for attempt in range(self._poll_attempts()):
            self._ensure_lock(run)
            if self.github.required_checks_passed(
                repository_url=run.repository_url,
                sha=sha,
            ):
                return True
            if attempt + 1 < self._poll_attempts():
                self.sleeper(self._poll_seconds())
        raise OperatorGitHubError("operator_checks_timeout")

    def _wait_deployment(self, run: AgentDispatchRun, sha: str) -> dict[str, Any]:
        for attempt in range(self._poll_attempts()):
            self._ensure_lock(run)
            deployment = self.github.deployment_for_sha(
                repository_url=run.repository_url,
                sha=sha,
                environment=(
                    self.settings.agent_dispatch_operator_deployment_environment
                ),
            )
            if deployment:
                return deployment
            if attempt + 1 < self._poll_attempts():
                self.sleeper(self._poll_seconds())
        raise OperatorGitHubError("operator_deployment_timeout")

    def _trigger_and_wait_regression(self, run: AgentDispatchRun, sha: str) -> bool:
        artifacts = self._artifacts(run)
        dispatch = artifacts.get("regression_dispatch") or {}
        if dispatch:
            workflow_run_id = int(dispatch["workflow_run_id"])
        else:
            intent = artifacts.get("regression_intent") or {}
            if not intent:
                intent = {
                    "workflow": self.settings.agent_dispatch_operator_regression_workflow,
                    "requested_at": datetime.now(timezone.utc).isoformat(),
                    "correlation_id": run.operator_correlation_id,
                }
                self._save_artifacts(run, regression_intent=intent)
            dispatch = self.github.trigger_regression(
                repository_url=run.repository_url,
                workflow=str(intent["workflow"]),
                ref=run.base_branch,
                sha=sha,
            )
            workflow_run_id = int(dispatch["workflow_run_id"])
            self._save_artifacts(run, regression_dispatch=dispatch)
        for attempt in range(self._poll_attempts()):
            self._ensure_lock(run)
            if self.github.regression_passed(
                repository_url=run.repository_url,
                workflow_run_id=workflow_run_id,
                sha=sha,
            ):
                return True
            if attempt + 1 < self._poll_attempts():
                self.sleeper(self._poll_seconds())
        raise OperatorGitHubError("operator_regression_timeout")

    def _merge_or_recover(self, run: AgentDispatchRun, head_sha: str) -> str:
        pr = self.github.get_pull_request(run.repository_url, self._require_pr(run))
        if pr.merged and pr.merge_sha:
            return pr.merge_sha
        if (
            pr.state != "open"
            or pr.draft
            or pr.base_ref != run.base_branch
            or pr.head_sha != head_sha
        ):
            raise OperatorGitHubError("operator_pr_changed_before_merge")
        return self.github.execute_standard_merge(
            repository_url=run.repository_url,
            pr_url=self._require_pr(run),
            expected_head_sha=head_sha,
            commit_title=run.task_name or "TWIN Dispatcher",
        )

    def _mergeability_artifact(self, run: AgentDispatchRun) -> dict[str, Any]:
        pr = self.github.verify_mergeability(
            repository_url=run.repository_url,
            pr_url=self._require_pr(run),
            base_branch=run.base_branch,
            attempts=max(1, int(self.settings.agent_dispatch_operator_max_retries or 1)),
            poll_seconds=self._poll_seconds(),
        )
        if run.result_head_sha and pr.head_sha != run.result_head_sha:
            raise OperatorGitHubError("operator_head_sha_changed")
        run.result_head_sha = pr.head_sha
        self.db.flush()
        return {
            "number": pr.number,
            "url": pr.url,
            "state": pr.state,
            "draft": pr.draft,
            "mergeable": pr.mergeable,
            "head_ref": pr.head_ref,
            "head_sha": pr.head_sha,
            "base_ref": pr.base_ref,
            "merged": pr.merged,
            "merge_sha": pr.merge_sha,
        }

    def _create_pr_artifact(
        self,
        run: AgentDispatchRun,
        title: str,
        body: str,
    ) -> dict[str, Any]:
        pr = self.github.create_pull_request(
            repository_url=run.repository_url,
            branch=run.result_branch or "",
            base_branch=run.base_branch,
            title=title,
            body=body,
        )
        return {"pr_url": pr.url, "pr_number": pr.number, "head_sha": pr.head_sha}

    def _assert_handoff_policy(self, run: AgentDispatchRun) -> None:
        self._assert_operator_enabled()
        self._assert_allowlisted(run)
        policy = self._json(run.execution_policy_json)
        if any(policy.get(key) is not True for key in DEFAULT_EXECUTION_POLICY):
            raise OperatorGitHubError("operator_policy_rejected")
        expected = self._expected(run)
        verified = self._verified(run)
        if expected["read_only"] or not expected["merge_required"]:
            raise OperatorGitHubError("operator_mutation_not_authorized")
        if not verified["pr_exists"] or not verified["ci_passed"]:
            raise OperatorGitHubError("operator_handoff_gate_failed")

    def _assert_create_pr_policy(self, run: AgentDispatchRun) -> None:
        self._assert_operator_enabled()
        self._assert_allowlisted(run)
        policy = self._json(run.execution_policy_json)
        expected = self._expected(run)
        if any(policy.get(key) is not True for key in DEFAULT_EXECUTION_POLICY):
            raise OperatorGitHubError("operator_policy_rejected")
        if expected["read_only"] or not expected["pr_required"]:
            raise OperatorGitHubError("operator_mutation_not_authorized")

    def _assert_merge_gate(self, run: AgentDispatchRun) -> None:
        self._assert_handoff_policy(run)
        if run.status not in {
            DispatchRunStatus.WAITING_FOR_OPERATOR.value,
            DispatchRunStatus.MERGING.value,
        }:
            raise OperatorGitHubError("operator_merge_state_invalid")

    def _assert_operator_enabled(self) -> None:
        if not self.settings.agent_dispatch_operator_enabled:
            raise OperatorGitHubError("operator_capability_missing")
        if not self.settings.agent_dispatch_operator_non_bypass_identity:
            raise OperatorGitHubError("operator_capability_missing")

    def _assert_allowlisted(self, run: AgentDispatchRun) -> None:
        repos = {
            item.strip().rstrip("/")
            for item in (self.settings.agent_dispatch_repo_allowlist or "").split(",")
            if item.strip()
        }
        branches = {
            item.strip()
            for item in (self.settings.agent_dispatch_base_branch_allowlist or "").split(",")
            if item.strip()
        }
        if not repos or run.repository_url.rstrip("/") not in repos:
            raise OperatorGitHubError("operator_repository_not_allowlisted")
        if not branches or run.base_branch not in branches:
            raise OperatorGitHubError("operator_branch_not_allowlisted")

    def _assert_expected_verified(self, run: AgentDispatchRun) -> None:
        expected = self._expected(run)
        verified = self._verified(run)
        checks = (
            ("merge_required", "merge_verified"),
            ("deployment_required", "deployment_verified"),
            ("regression_required", "regression_passed"),
        )
        if any(expected[required] and not verified[present] for required, present in checks):
            raise OperatorGitHubError("operator_final_verification_failed")

    def _fail(self, run: AgentDispatchRun, reason: str, correlation: str) -> AgentDispatchRun:
        run.status = DispatchRunStatus.NEEDS_ATTENTION.value
        run.error_code = reason
        run.error_message = reason
        run.finished_at = _utcnow()
        run.operator_updated_at = _utcnow()
        release_lock(self.db, run_id=run.id)
        self._audit(run, "operator_needs_attention", correlation, {"reason_code": reason})
        self.db.commit()
        self.db.refresh(run)
        return run

    def _resume_after_failure(self, run: AgentDispatchRun) -> None:
        self._assert_operator_enabled()
        self._assert_allowlisted(run)
        self._ensure_lock(run)
        expected = self._expected(run)
        verified = self._verified(run)
        artifacts = self._artifacts(run)
        if artifacts.get("merge_sha") and not verified["merge_verified"]:
            self._state(run, DispatchRunStatus.MERGING)
        elif expected["deployment_required"] and not verified["deployment_verified"]:
            self._state(run, DispatchRunStatus.DEPLOYING)
        elif expected["regression_required"] and not verified["regression_passed"]:
            self._state(run, DispatchRunStatus.REGRESSION)
        elif verified["merge_verified"]:
            self._state(run, DispatchRunStatus.FINALIZING)
        else:
            self.handoff(run.id, correlation_id=run.operator_correlation_id)

    def _ensure_lock(self, run: AgentDispatchRun) -> None:
        self._assert_operator_enabled()
        self._assert_allowlisted(run)
        self.db.expire(run)
        self.db.refresh(run)
        if run.status in {
            DispatchRunStatus.CANCELLED.value,
            DispatchRunStatus.CANCELLING.value,
        }:
            raise OperatorGitHubError("operator_cancelled")
        owned = self.db.execute(
            select(AgentDispatchLock)
            .where(AgentDispatchLock.run_id == run.id)
            .with_for_update()
        ).scalar_one_or_none()
        if owned:
            owned.lease_expires_at = _utcnow() + self._lease_delta()
            owned.updated_at = _utcnow()
            self._heartbeat_operation()
            self.db.commit()
            return
        try:
            acquire_lock(
                self.db,
                repo_url=run.repository_url,
                base_branch=run.base_branch,
                run=run,
                lease_seconds=int(self.settings.agent_dispatch_lock_lease_seconds or 120),
                holder_fingerprint=self.actor_fingerprint,
            )
        except LockConflictError as exc:
            self.db.rollback()
            raise OperatorGitHubError("operator_lock_conflict", retryable=True) from exc
        self._heartbeat_operation()
        self.db.commit()

    def _state(self, run: AgentDispatchRun, state: DispatchRunStatus) -> None:
        self._transition(run, state)

    def _transition(self, run: AgentDispatchRun, state: DispatchRunStatus) -> None:
        self._assert_operator_enabled()
        self._assert_allowlisted(run)
        locked_run = self.db.execute(
            select(AgentDispatchRun)
            .where(AgentDispatchRun.id == run.id)
            .with_for_update()
        ).scalar_one()
        allowed = self._transition_sources(state)
        if locked_run.status not in allowed:
            self.db.rollback()
            raise OperatorGitHubError("operator_state_changed")
        owned = self.db.execute(
            select(AgentDispatchLock)
            .where(AgentDispatchLock.run_id == run.id)
            .with_for_update()
        ).scalar_one_or_none()
        if not owned:
            self.db.rollback()
            raise OperatorGitHubError("operator_lock_lost")
        owned.lease_expires_at = _utcnow() + self._lease_delta()
        locked_run.status = state.value
        locked_run.operator_updated_at = _utcnow()
        self.db.commit()
        self.db.refresh(run)

    @staticmethod
    def _transition_sources(state: DispatchRunStatus) -> set[str]:
        retry = DispatchRunStatus.NEEDS_ATTENTION.value
        sources = {
            DispatchRunStatus.WAITING_FOR_OPERATOR: {
                DispatchRunStatus.AWAITING_RESULT.value,
                DispatchRunStatus.WAITING_FOR_OPERATOR.value,
                retry,
            },
            DispatchRunStatus.MERGING: {
                DispatchRunStatus.WAITING_FOR_OPERATOR.value,
                DispatchRunStatus.MERGING.value,
                retry,
            },
            DispatchRunStatus.DEPLOYING: {
                DispatchRunStatus.MERGING.value,
                DispatchRunStatus.DEPLOYING.value,
                retry,
            },
            DispatchRunStatus.REGRESSION: {
                DispatchRunStatus.DEPLOYING.value,
                DispatchRunStatus.REGRESSION.value,
                retry,
            },
            DispatchRunStatus.FINALIZING: {
                DispatchRunStatus.REGRESSION.value,
                DispatchRunStatus.FINALIZING.value,
                retry,
            },
        }
        return sources[state]

    def _set_verified(self, run: AgentDispatchRun, **updates: bool) -> None:
        verified = self._verified(run)
        verified.update(updates)
        run.verified_artifacts_json = json.dumps(verified, sort_keys=True)
        enrichment = self._json(run.github_enrichment_json)
        if enrichment:
            enrichment["verified_artifacts"] = verified
            enrichment["ok"] = self._expected_verified(run, verified)
            enrichment["attention_reason"] = None if enrichment["ok"] else enrichment.get(
                "attention_reason"
            )
            run.github_enrichment_json = json.dumps(enrichment, sort_keys=True)
        self.db.commit()

    def _expected_verified(
        self,
        run: AgentDispatchRun,
        verified: dict[str, bool],
    ) -> bool:
        expected = self._expected(run)
        pairs = (
            ("pr_required", "pr_exists"),
            ("merge_required", "merge_verified"),
            ("deployment_required", "deployment_verified"),
            ("ci_required", "ci_passed"),
            ("regression_required", "regression_passed"),
            ("commit_required", "commit_exists"),
        )
        return all(not expected[required] or verified[present] for required, present in pairs)

    def _save_artifacts(self, run: AgentDispatchRun, **updates: Any) -> None:
        artifacts = self._artifacts(run)
        artifacts.update(updates)
        run.operator_artifacts_json = json.dumps(artifacts, default=str, sort_keys=True)
        run.operator_updated_at = _utcnow()
        self.db.commit()

    def _claim_operation(
        self,
        run: AgentDispatchRun,
        operation: str,
        key: str,
        correlation: str,
    ) -> AgentDispatchOperatorOperation:
        digest = hashlib.sha256(key.encode("utf-8")).hexdigest()
        self.db.execute(
            select(AgentDispatchRun)
            .where(AgentDispatchRun.id == run.id)
            .with_for_update()
        ).scalar_one()
        row = self.db.execute(
            select(AgentDispatchOperatorOperation)
            .where(
                AgentDispatchOperatorOperation.run_id == run.id,
                AgentDispatchOperatorOperation.operation == operation,
                AgentDispatchOperatorOperation.idempotency_key == digest,
            )
            .with_for_update()
        ).scalar_one_or_none()
        if row and row.status == "completed":
            self.db.commit()
            return row
        now = _utcnow()
        leased = bool(
            row
            and row.status == "started"
            and row.lease_expires_at
            and row.lease_expires_at >= now
            and row.owner_token != self.owner_token
        )
        if leased:
            self.db.commit()
            raise OperatorGitHubError(
                "operator_operation_in_progress",
                retryable=True,
            )
        if row:
            row.status = "started"
            row.attempt_count += 1
            row.error_code = None
            row.finished_at = None
            row.owner_token = self.owner_token
            row.lease_expires_at = now + self._lease_delta()
        else:
            row = AgentDispatchOperatorOperation(
                run_id=run.id,
                operation=operation,
                idempotency_key=digest,
                correlation_id=correlation,
                owner_token=self.owner_token,
                lease_expires_at=now + self._lease_delta(),
                status="started",
                attempt_count=1,
            )
            self.db.add(row)
        self._audit(run, "operator_stage_started", correlation, {"operation": operation})
        self.db.commit()
        return row

    def _heartbeat_operation(self) -> None:
        row = self._current_operation
        if not row:
            return
        now = _utcnow()
        result = self.db.execute(
            update(AgentDispatchOperatorOperation)
            .where(
                AgentDispatchOperatorOperation.id == row.id,
                AgentDispatchOperatorOperation.owner_token == self.owner_token,
                AgentDispatchOperatorOperation.status == "started",
                AgentDispatchOperatorOperation.lease_expires_at >= now,
            )
            .values(lease_expires_at=now + self._lease_delta())
        )
        if result.rowcount != 1:
            self.db.rollback()
            raise OperatorGitHubError("operator_operation_lease_lost")

    def _lease_delta(self) -> timedelta:
        seconds = max(60, int(self.settings.agent_dispatch_lock_lease_seconds or 120))
        return timedelta(seconds=seconds)

    def _audit(
        self,
        run: AgentDispatchRun,
        event: str,
        correlation: str,
        detail: dict[str, Any],
    ) -> None:
        write_audit(
            self.db,
            run_id=run.id,
            event_type=event,
            actor_fingerprint=self.actor_fingerprint,
            detail={"correlation_id": correlation, **detail},
        )

    def _correlation(self, run: AgentDispatchRun, supplied: str | None) -> str:
        correlation = supplied or run.operator_correlation_id or str(uuid.uuid4())
        if run.operator_correlation_id and supplied and run.operator_correlation_id != supplied:
            raise OperatorGitHubError("operator_correlation_conflict")
        run.operator_correlation_id = correlation
        run.operator_updated_at = _utcnow()
        self.db.commit()
        return correlation

    def _run(self, run_id: str) -> AgentDispatchRun:
        run = self.db.get(AgentDispatchRun, run_id)
        if not run:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="run not found")
        return run

    @staticmethod
    def _operator_states() -> set[str]:
        return set(OPERATOR_RUN_STATUSES)

    @staticmethod
    def _json(value: str | None) -> dict[str, Any]:
        try:
            return json.loads(value or "{}")
        except json.JSONDecodeError:
            return {}

    def _expected(self, run: AgentDispatchRun) -> dict[str, bool]:
        return normalize_expected(self._json(run.expected_artifacts_json))

    def _verified(self, run: AgentDispatchRun) -> dict[str, bool]:
        return normalize_verified(self._json(run.verified_artifacts_json))

    def _artifacts(self, run: AgentDispatchRun) -> dict[str, Any]:
        return self._json(run.operator_artifacts_json)

    def _artifact_string(self, run: AgentDispatchRun, key: str) -> str:
        value = str(self._artifacts(run).get(key) or "")
        if not value:
            raise OperatorGitHubError(f"operator_{key}_missing")
        return value

    @staticmethod
    def _require_pr(run: AgentDispatchRun) -> str:
        if not run.result_pr_url:
            raise OperatorGitHubError("operator_pr_missing")
        return run.result_pr_url

    @staticmethod
    def _require_head_sha(run: AgentDispatchRun) -> str:
        if not run.result_head_sha:
            raise OperatorGitHubError("operator_head_sha_missing")
        return run.result_head_sha

    def _poll_seconds(self) -> float:
        return max(0.0, float(self.settings.agent_dispatch_operator_poll_seconds or 0))

    def _poll_attempts(self) -> int:
        timeout = max(1, int(self.settings.agent_dispatch_operator_timeout_seconds or 1))
        interval = max(1, int(self.settings.agent_dispatch_operator_poll_seconds or 1))
        return max(1, timeout // interval)


def recover_operator_runs(db: Session, settings: Settings) -> dict[str, int]:
    """Resume only already-started Operator stages after a worker restart."""
    if not settings.agent_dispatch_operator_enabled:
        return {"recovered": 0}
    resumable = {
        DispatchRunStatus.MERGING.value,
        DispatchRunStatus.DEPLOYING.value,
        DispatchRunStatus.REGRESSION.value,
        DispatchRunStatus.FINALIZING.value,
    }
    run_ids = list(
        db.execute(
            select(AgentDispatchRun.id).where(
                or_(
                    AgentDispatchRun.status.in_(resumable),
                    (
                        (AgentDispatchRun.status == DispatchRunStatus.WAITING_FOR_OPERATOR.value)
                        & AgentDispatchRun.operator_requested_at.isnot(None)
                    ),
                )
            )
        ).scalars()
    )
    recovered = 0
    for run_id in run_ids:
        try:
            OperatorService(db, settings, recovery=True).run(run_id)
            recovered += 1
        except Exception:
            db.rollback()
    return {"recovered": recovered}
