"""GitHub REST adapter for explicit, branch-protection-respecting Operator actions."""

from __future__ import annotations

import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Callable
from urllib.parse import urlparse

import httpx

from app.config import Settings
from app.services.agent_dispatch.github_enricher import parse_github_repo, parse_pr_url


class OperatorGitHubError(RuntimeError):
    """Safe external-operation failure carrying a stable reason code."""

    def __init__(self, reason_code: str, *, retryable: bool = False):
        self.reason_code = reason_code
        self.retryable = retryable
        super().__init__(reason_code)


@dataclass(frozen=True)
class PullRequestState:
    number: int
    url: str
    state: str
    draft: bool
    mergeable: bool | None
    head_ref: str
    head_sha: str
    base_ref: str
    merged: bool
    merge_sha: str | None


class GitHubOperatorClient:
    """Minimal GitHub client; it never requests auto-merge or admin bypass."""

    def __init__(
        self,
        settings: Settings,
        *,
        transport: httpx.BaseTransport | None = None,
        sleeper: Callable[[float], None] = time.sleep,
    ):
        token = (settings.agent_dispatch_github_token or "").strip()
        self._headers = {
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "twin-agent-dispatch-operator",
        }
        if token:
            self._headers["Authorization"] = f"Bearer {token}"
        self._configured = bool(token)
        self._transport = transport
        self._sleeper = sleeper

    def create_pull_request(
        self,
        *,
        repository_url: str,
        branch: str,
        base_branch: str,
        title: str,
        body: str,
    ) -> PullRequestState:
        owner, repo = self._repo(repository_url)
        existing = self._request(
            "GET",
            f"/repos/{owner}/{repo}/pulls",
            params={"head": f"{owner}:{branch}", "base": base_branch, "state": "all"},
        ).json()
        if existing:
            return self._pr(existing[0])
        response = self._request(
            "POST",
            f"/repos/{owner}/{repo}/pulls",
            json={"title": title, "head": branch, "base": base_branch, "body": body},
            allowed={201},
        )
        return self._pr(response.json())

    def get_pull_request(self, repository_url: str, pr_url: str) -> PullRequestState:
        owner, repo, number = self._pr_location(repository_url, pr_url)
        response = self._request("GET", f"/repos/{owner}/{repo}/pulls/{number}")
        return self._pr(response.json())

    def verify_mergeability(
        self,
        *,
        repository_url: str,
        pr_url: str,
        base_branch: str,
        attempts: int,
        poll_seconds: float,
    ) -> PullRequestState:
        latest: PullRequestState | None = None
        for attempt in range(max(1, attempts)):
            latest = self.get_pull_request(repository_url, pr_url)
            if latest.base_ref != base_branch or latest.draft or latest.state != "open":
                raise OperatorGitHubError("operator_pr_not_mergeable")
            if latest.mergeable is True:
                return latest
            if latest.mergeable is False:
                raise OperatorGitHubError("operator_pr_not_mergeable")
            if attempt + 1 < attempts:
                self._sleeper(poll_seconds)
        raise OperatorGitHubError("operator_mergeability_timeout", retryable=True)

    def required_checks_passed(
        self,
        *,
        repository_url: str,
        sha: str,
    ) -> bool:
        owner, repo = self._repo(repository_url)
        status = self._request(
            "GET", f"/repos/{owner}/{repo}/commits/{sha}/status"
        ).json()
        checks = self._check_runs(owner, repo, sha)
        checks_ok = bool(checks) and all(
            check.get("status") == "completed"
            and check.get("conclusion") in {"success", "neutral", "skipped"}
            for check in checks
        )
        legacy_present = bool(status.get("total_count") or status.get("statuses"))
        return (status.get("state") == "success" and (not checks or checks_ok)) or (
            not legacy_present and checks_ok
        )

    def execute_standard_merge(
        self,
        *,
        repository_url: str,
        pr_url: str,
        expected_head_sha: str,
        commit_title: str,
    ) -> str:
        owner, repo, number = self._pr_location(repository_url, pr_url)
        response = self._request(
            "PUT",
            f"/repos/{owner}/{repo}/pulls/{number}/merge",
            json={
                "commit_title": commit_title,
                "sha": expected_head_sha,
                "merge_method": "merge",
            },
            allowed={200, 405, 409},
        )
        body = response.json()
        if response.status_code != 200 or not body.get("merged"):
            raise OperatorGitHubError("operator_merge_rejected")
        sha = str(body.get("sha") or "")
        if not sha:
            raise OperatorGitHubError("operator_merge_sha_missing")
        return sha

    def verify_commit(self, repository_url: str, sha: str) -> bool:
        owner, repo = self._repo(repository_url)
        response = self._request(
            "GET",
            f"/repos/{owner}/{repo}/commits/{sha}",
            allowed={200, 404},
        )
        return response.status_code == 200 and response.json().get("sha") == sha

    def deployment_for_sha(
        self,
        *,
        repository_url: str,
        sha: str,
        environment: str = "production",
    ) -> dict[str, Any] | None:
        owner, repo = self._repo(repository_url)
        deployments = self._request(
            "GET",
            f"/repos/{owner}/{repo}/deployments",
            params={"sha": sha, "environment": environment, "per_page": 10},
        ).json()
        for deployment in deployments:
            statuses = self._request(
                "GET",
                f"/repos/{owner}/{repo}/deployments/{deployment['id']}/statuses",
                params={"per_page": 1},
            ).json()
            if statuses and statuses[0].get("state") == "success":
                return {
                    key: deployment.get(key)
                    for key in ("id", "sha", "environment", "created_at")
                }
        return None

    def trigger_regression(
        self,
        *,
        repository_url: str,
        workflow: str,
        ref: str,
    ) -> dict[str, Any]:
        if not workflow:
            raise OperatorGitHubError("operator_regression_workflow_missing")
        owner, repo = self._repo(repository_url)
        response = self._request(
            "POST",
            f"/repos/{owner}/{repo}/actions/workflows/{workflow}/dispatches",
            json={"ref": ref, "return_run_details": True},
            allowed={200},
        )
        body = response.json()
        run_id = body.get("workflow_run_id")
        if not run_id:
            raise OperatorGitHubError("operator_regression_run_missing")
        return {
            "workflow_run_id": int(run_id),
            "triggered_at": datetime.now(timezone.utc).isoformat(),
        }

    def regression_passed(
        self,
        *,
        repository_url: str,
        workflow_run_id: int,
        sha: str,
    ) -> bool:
        owner, repo = self._repo(repository_url)
        run = self._request(
            "GET",
            f"/repos/{owner}/{repo}/actions/runs/{workflow_run_id}",
        ).json()
        return bool(
            run.get("id") == workflow_run_id
            and run.get("event") == "workflow_dispatch"
            and run.get("head_sha") == sha
            and run.get("status") == "completed"
            and run.get("conclusion") == "success"
        )

    def _check_runs(self, owner: str, repo: str, sha: str) -> list[dict[str, Any]]:
        runs: list[dict[str, Any]] = []
        page = 1
        while True:
            body = self._request(
                "GET",
                f"/repos/{owner}/{repo}/commits/{sha}/check-runs",
                params={"per_page": 100, "page": page},
            ).json()
            batch = body.get("check_runs", [])
            runs.extend(batch)
            if len(runs) >= int(body.get("total_count") or len(runs)) or not batch:
                return runs
            page += 1

    def _request(
        self,
        method: str,
        path: str,
        *,
        allowed: set[int] | None = None,
        **kwargs: Any,
    ) -> httpx.Response:
        if not self._configured:
            raise OperatorGitHubError("operator_capability_missing")
        try:
            with httpx.Client(
                base_url="https://api.github.com",
                headers=self._headers,
                timeout=30.0,
                transport=self._transport,
            ) as client:
                response = client.request(method, path, **kwargs)
        except httpx.TransportError as exc:
            raise OperatorGitHubError(
                "operator_github_retryable",
                retryable=True,
            ) from exc
        accepted = allowed or {200}
        if response.status_code not in accepted:
            retryable = response.status_code in {408, 429, 500, 502, 503, 504}
            code = "operator_github_retryable" if retryable else "operator_github_rejected"
            raise OperatorGitHubError(code, retryable=retryable)
        return response

    @staticmethod
    def _pr(body: dict[str, Any]) -> PullRequestState:
        return PullRequestState(
            number=int(body["number"]),
            url=str(body.get("html_url") or body.get("url") or ""),
            state=str(body.get("state") or ""),
            draft=bool(body.get("draft")),
            mergeable=body.get("mergeable"),
            head_ref=str((body.get("head") or {}).get("ref") or ""),
            head_sha=str((body.get("head") or {}).get("sha") or ""),
            base_ref=str((body.get("base") or {}).get("ref") or ""),
            merged=bool(body.get("merged") or body.get("merged_at")),
            merge_sha=body.get("merge_commit_sha"),
        )

    @staticmethod
    def _repo(repository_url: str) -> tuple[str, str]:
        parsed_url = urlparse(
            repository_url if "://" in repository_url else f"https://{repository_url}"
        )
        if (parsed_url.hostname or "").lower() != "github.com":
            raise OperatorGitHubError("operator_repository_invalid")
        parsed = parse_github_repo(repository_url)
        if not parsed:
            raise OperatorGitHubError("operator_repository_invalid")
        return parsed

    @classmethod
    def _pr_location(cls, repository_url: str, pr_url: str) -> tuple[str, str, int]:
        owner, repo = cls._repo(repository_url)
        parsed = parse_pr_url(pr_url)
        if not parsed or tuple(part.lower() for part in parsed[:2]) != (
            owner.lower(),
            repo.lower(),
        ):
            raise OperatorGitHubError("operator_pr_repository_mismatch")
        return parsed


