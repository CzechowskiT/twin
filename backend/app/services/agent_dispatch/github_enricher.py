"""Verify GitHub PR, commit, merge, CI, deployment, and regression artifacts."""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from typing import Any
from urllib.parse import urlparse

import httpx

from app.config import Settings
from app.services.agent_dispatch.artifacts import missing_reason, normalize_expected

logger = logging.getLogger(__name__)
_PR_RE = re.compile(r"github\.com/([^/]+)/([^/]+)/pull/(\d+)", re.I)


@dataclass(frozen=True)
class GitHubEnrichment:
    owner: str
    repo: str
    branch_name: str | None
    pr_number: int | None
    pr_url: str | None
    head_sha: str | None
    ci_status: str | None
    verified_artifacts: dict[str, bool]
    ok: bool
    attention_reason: str | None
    verification_error: bool
    raw: dict[str, Any]


def parse_github_repo(repo_url: str) -> tuple[str, str] | None:
    raw = (repo_url or "").strip().rstrip("/")
    if raw.startswith("github.com/"):
        raw = "https://" + raw
    parsed = urlparse(raw if "://" in raw else f"https://{raw}")
    parts = [part for part in parsed.path.split("/") if part]
    if len(parts) < 2:
        return None
    return parts[0], parts[1].removesuffix(".git")


def parse_pr_url(pr_url: str | None) -> tuple[str, str, int] | None:
    if not pr_url:
        return None
    match = _PR_RE.search(pr_url)
    if not match:
        return None
    return match.group(1), match.group(2).removesuffix(".git"), int(match.group(3))


class GitHubEnricher:
    def __init__(self, settings: Settings, *, transport: httpx.BaseTransport | None = None):
        self._token = (settings.agent_dispatch_github_token or "").strip()
        self._transport = transport

    def enrich(
        self,
        *,
        repository_url: str,
        branch_name: str | None,
        pr_url: str | None,
        expected_artifacts: dict[str, Any],
        expected_base_branch: str | None = None,
    ) -> GitHubEnrichment:
        expected = normalize_expected(expected_artifacts)
        parsed = parse_github_repo(repository_url)
        if not parsed:
            return self._result(
                owner="",
                repo="",
                branch_name=branch_name,
                pr_url=pr_url,
                expected=expected,
                raw={"error": "unparseable_repository_url"},
                verification_error=True,
            )
        owner, repo = parsed
        if not self._token:
            return self._result(
                owner=owner,
                repo=repo,
                branch_name=branch_name,
                pr_url=pr_url,
                expected=expected,
                raw={"note": "github_token_absent"},
            )
        headers = {
            "Authorization": f"Bearer {self._token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "twin-agent-dispatcher",
        }
        try:
            with httpx.Client(timeout=30.0, transport=self._transport, headers=headers) as client:
                return self._enrich_with_client(
                    client,
                    owner,
                    repo,
                    branch_name,
                    pr_url,
                    expected,
                    expected_base_branch,
                )
        except (httpx.HTTPError, ValueError, TypeError, KeyError) as exc:
            logger.warning("GitHub artifact verification failed: %s", type(exc).__name__)
            return self._result(
                owner=owner,
                repo=repo,
                branch_name=branch_name,
                pr_url=pr_url,
                expected=expected,
                raw={"error": type(exc).__name__},
                verification_error=True,
            )

    def _enrich_with_client(
        self,
        client: httpx.Client,
        owner: str,
        repo: str,
        branch_name: str | None,
        pr_url: str | None,
        expected: dict[str, bool],
        expected_base_branch: str | None,
    ) -> GitHubEnrichment:
        raw: dict[str, Any] = {}
        verified = self._empty_verified()
        pr_meta = parse_pr_url(pr_url)
        pr_number = pr_meta[2] if pr_meta else None
        if pr_meta and (pr_meta[0].lower(), pr_meta[1].lower()) != (
            owner.lower(),
            repo.lower(),
        ):
            raw["pr_repository_mismatch"] = True
            pr_number = None
        head_sha, merge_sha, branch_name = self._fetch_git_state(
            client,
            owner,
            repo,
            branch_name,
            pr_number,
            expected_base_branch,
            verified,
            raw,
        )
        verification_sha = merge_sha or head_sha
        ci_status = self._fetch_checks(
            client, owner, repo, head_sha, verification_sha, expected, verified, raw
        )
        self._fetch_deployment(
            client, owner, repo, verification_sha, expected, verified, raw
        )
        return self._result(
            owner=owner,
            repo=repo,
            branch_name=branch_name,
            pr_number=pr_number,
            pr_url=pr_url,
            head_sha=head_sha,
            ci_status=ci_status,
            expected=expected,
            verified=verified,
            raw=raw,
        )

    def _fetch_git_state(
        self,
        client: httpx.Client,
        owner: str,
        repo: str,
        branch_name: str | None,
        pr_number: int | None,
        expected_base_branch: str | None,
        verified: dict[str, bool],
        raw: dict[str, Any],
    ) -> tuple[str | None, str | None, str | None]:
        head_sha = merge_sha = None
        if pr_number:
            response = client.get(f"https://api.github.com/repos/{owner}/{repo}/pulls/{pr_number}")
            self._raise_unexpected(response, {200, 404})
            raw["pr_status"] = response.status_code
            if response.status_code == 200:
                body = response.json()
                head = body.get("head") or {}
                base = body.get("base") or {}
                branch_matches = not branch_name or head.get("ref") == branch_name
                base_matches = (
                    not expected_base_branch or base.get("ref") == expected_base_branch
                )
                raw["pr_branch_matches"] = branch_matches
                raw["pr_base_matches"] = base_matches
                if branch_matches and base_matches:
                    verified["pr_exists"] = True
                    head_sha = head.get("sha")
                    branch_name = branch_name or head.get("ref")
                    verified["merge_verified"] = bool(body.get("merged_at"))
                    merge_sha = (
                        body.get("merge_commit_sha")
                        if verified["merge_verified"]
                        else None
                    )
        elif branch_name:
            response = client.get(
                f"https://api.github.com/repos/{owner}/{repo}/git/ref/heads/{branch_name}"
            )
            self._raise_unexpected(response, {200, 404})
            raw["ref_status"] = response.status_code
            if response.status_code == 200:
                head_sha = (response.json().get("object") or {}).get("sha")
                if expected_base_branch:
                    base_response = client.get(
                        f"https://api.github.com/repos/{owner}/{repo}/git/ref/heads/"
                        f"{expected_base_branch}"
                    )
                    self._raise_unexpected(base_response, {200, 404})
                    base_sha = (
                        (base_response.json().get("object") or {}).get("sha")
                        if base_response.status_code == 200
                        else None
                    )
                    if base_sha and base_sha == head_sha:
                        raw["head_matches_base"] = True
                        head_sha = None
        if head_sha:
            response = client.get(f"https://api.github.com/repos/{owner}/{repo}/commits/{head_sha}")
            self._raise_unexpected(response, {200, 404})
            raw["commit_status"] = response.status_code
            verified["commit_exists"] = response.status_code == 200
            verified["head_sha_verified"] = verified["commit_exists"]
        return head_sha, merge_sha, branch_name

    def _fetch_checks(
        self,
        client: httpx.Client,
        owner: str,
        repo: str,
        head_sha: str | None,
        regression_sha: str | None,
        expected: dict[str, bool],
        verified: dict[str, bool],
        raw: dict[str, Any],
    ) -> str:
        if not (expected["ci_required"] or expected["regression_required"]):
            return "skipped"
        ci_runs: list[dict[str, Any]] = []
        state = "unknown"
        if expected["ci_required"] and head_sha:
            combined = client.get(
                f"https://api.github.com/repos/{owner}/{repo}/commits/{head_sha}/status"
            )
            self._raise_unexpected(combined, {200})
            raw["combined_status_code"] = combined.status_code
            combined_body = combined.json() if combined.status_code == 200 else {}
            state = combined_body.get("state", "unknown")
            legacy_present = bool(
                combined_body.get("total_count") or combined_body.get("statuses")
            )
            ci_runs = self._list_check_runs(client, owner, repo, head_sha, raw, "ci")
            checks_passed = self._all_checks_passed(ci_runs)
            verified["ci_passed"] = (
                (state == "success" and (not ci_runs or checks_passed))
                or (not legacy_present and checks_passed)
            )
        regression_runs = ci_runs
        if (
            expected["regression_required"]
            and regression_sha
            and (not expected["ci_required"] or regression_sha != head_sha)
        ):
            regression_runs = self._list_check_runs(
                client, owner, repo, regression_sha, raw, "regression"
            )
        regression = [
            run
            for run in regression_runs
            if "regression" in str(run.get("name", "")).lower()
        ]
        verified["regression_passed"] = bool(regression) and all(
            run.get("status") == "completed" and run.get("conclusion") == "success"
            for run in regression
        )
        raw["combined_status"] = state
        raw["check_run_count"] = len(ci_runs)
        return "success" if verified["ci_passed"] else state

    @staticmethod
    def _all_checks_passed(runs: list[dict[str, Any]]) -> bool:
        return any(run.get("conclusion") == "success" for run in runs) and all(
            run.get("status") == "completed"
            and run.get("conclusion") in {"success", "neutral", "skipped"}
            for run in runs
        )

    @staticmethod
    def _list_check_runs(
        client: httpx.Client,
        owner: str,
        repo: str,
        sha: str,
        raw: dict[str, Any],
        label: str,
    ) -> list[dict[str, Any]]:
        response = client.get(
            f"https://api.github.com/repos/{owner}/{repo}/commits/{sha}/check-runs"
        )
        GitHubEnricher._raise_unexpected(response, {200})
        raw[f"{label}_check_runs_status_code"] = response.status_code
        if response.status_code != 200:
            return []
        return response.json().get("check_runs", [])

    def _fetch_deployment(
        self,
        client: httpx.Client,
        owner: str,
        repo: str,
        sha: str | None,
        expected: dict[str, bool],
        verified: dict[str, bool],
        raw: dict[str, Any],
    ) -> None:
        if not sha or not expected["deployment_required"]:
            return
        response = client.get(
            f"https://api.github.com/repos/{owner}/{repo}/deployments",
            params={"sha": sha, "environment": "production", "per_page": 10},
        )
        self._raise_unexpected(response, {200})
        raw["deployments_status_code"] = response.status_code
        deployments = response.json() if response.status_code == 200 else []
        for deployment in deployments:
            statuses = client.get(
                f"https://api.github.com/repos/{owner}/{repo}/deployments/"
                f"{deployment['id']}/statuses",
                params={"per_page": 1},
            )
            self._raise_unexpected(statuses, {200})
            if statuses.status_code == 200 and statuses.json():
                if statuses.json()[0].get("state") == "success":
                    verified["deployment_verified"] = True
                    raw["deployment_id"] = deployment["id"]
                    return

    @staticmethod
    def _raise_unexpected(response: httpx.Response, allowed: set[int]) -> None:
        if response.status_code not in allowed:
            raise httpx.HTTPStatusError(
                "GitHub API verification failed",
                request=response.request,
                response=response,
            )

    @staticmethod
    def _empty_verified() -> dict[str, bool]:
        return {
            "pr_exists": False,
            "merge_verified": False,
            "deployment_verified": False,
            "ci_passed": False,
            "regression_passed": False,
            "commit_exists": False,
            "head_sha_verified": False,
        }

    def _result(
        self,
        *,
        owner: str,
        repo: str,
        branch_name: str | None,
        pr_url: str | None,
        expected: dict[str, bool],
        raw: dict[str, Any],
        pr_number: int | None = None,
        head_sha: str | None = None,
        ci_status: str = "skipped",
        verified: dict[str, bool] | None = None,
        verification_error: bool = False,
    ) -> GitHubEnrichment:
        artifacts = verified or self._empty_verified()
        reason = missing_reason(expected, artifacts)
        return GitHubEnrichment(
            owner=owner,
            repo=repo,
            branch_name=branch_name,
            pr_number=pr_number,
            pr_url=pr_url,
            head_sha=head_sha,
            ci_status=ci_status,
            verified_artifacts=artifacts,
            ok=reason is None and not verification_error,
            attention_reason="reconcile_failed" if verification_error else reason,
            verification_error=verification_error,
            raw=raw,
        )
