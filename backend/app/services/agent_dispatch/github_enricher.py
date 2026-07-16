"""GitHub enrichment — branch / PR / SHA / CI status before marking succeeded."""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from typing import Any
from urllib.parse import urlparse

import httpx

from app.config import Settings

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
    ci_status: str | None  # success | pending | failure | unknown | skipped
    ok: bool
    attention_reason: str | None
    raw: dict[str, Any]


def parse_github_repo(repo_url: str) -> tuple[str, str] | None:
    raw = (repo_url or "").strip().rstrip("/")
    if raw.startswith("github.com/"):
        raw = "https://" + raw
    parsed = urlparse(raw if "://" in raw else f"https://{raw}")
    parts = [p for p in parsed.path.split("/") if p]
    if len(parts) < 2:
        return None
    return parts[0], parts[1].removesuffix(".git")


def parse_pr_url(pr_url: str | None) -> tuple[str, str, int] | None:
    if not pr_url:
        return None
    m = _PR_RE.search(pr_url)
    if not m:
        return None
    return m.group(1), m.group(2).removesuffix(".git"), int(m.group(3))


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
        require_pr: bool,
        require_ci: bool,
    ) -> GitHubEnrichment:
        parsed = parse_github_repo(repository_url)
        if not parsed:
            return GitHubEnrichment(
                owner="",
                repo="",
                branch_name=branch_name,
                pr_number=None,
                pr_url=pr_url,
                head_sha=None,
                ci_status="skipped",
                ok=False,
                attention_reason="unparseable_repository_url",
                raw={},
            )
        owner, repo = parsed
        pr_meta = parse_pr_url(pr_url)
        pr_number = pr_meta[2] if pr_meta else None

        if not self._token:
            # Soft enrichment — no token; succeed with skipped CI unless PR required.
            if require_pr and not pr_url:
                return GitHubEnrichment(
                    owner=owner,
                    repo=repo,
                    branch_name=branch_name,
                    pr_number=pr_number,
                    pr_url=pr_url,
                    head_sha=None,
                    ci_status="skipped",
                    ok=False,
                    attention_reason="missing_pr_and_github_token",
                    raw={},
                )
            return GitHubEnrichment(
                owner=owner,
                repo=repo,
                branch_name=branch_name,
                pr_number=pr_number,
                pr_url=pr_url,
                head_sha=None,
                ci_status="skipped",
                ok=True,
                attention_reason=None,
                raw={"note": "github_token_absent"},
            )

        headers = {
            "Authorization": f"Bearer {self._token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "twin-agent-dispatcher",
        }
        raw: dict[str, Any] = {}
        head_sha: str | None = None
        ci_status = "unknown"
        attention: str | None = None

        with httpx.Client(timeout=30.0, transport=self._transport, headers=headers) as client:
            if pr_number:
                pr_res = client.get(f"https://api.github.com/repos/{owner}/{repo}/pulls/{pr_number}")
                raw["pr_status"] = pr_res.status_code
                if pr_res.status_code == 200:
                    pr_body = pr_res.json()
                    raw["pr"] = {"number": pr_body.get("number"), "state": pr_body.get("state")}
                    head_sha = (pr_body.get("head") or {}).get("sha")
                    branch_name = branch_name or (pr_body.get("head") or {}).get("ref")
                elif require_pr:
                    attention = "pr_not_found"
            elif branch_name:
                ref_res = client.get(
                    f"https://api.github.com/repos/{owner}/{repo}/git/ref/heads/{branch_name}"
                )
                raw["ref_status"] = ref_res.status_code
                if ref_res.status_code == 200:
                    head_sha = (ref_res.json().get("object") or {}).get("sha")
                elif require_pr:
                    attention = attention or "branch_not_found"
            elif require_pr:
                attention = "missing_pr_and_branch"

            if head_sha:
                check_res = client.get(
                    f"https://api.github.com/repos/{owner}/{repo}/commits/{head_sha}/status"
                )
                raw["combined_status_code"] = check_res.status_code
                if check_res.status_code == 200:
                    state = check_res.json().get("state") or "unknown"
                    ci_status = state  # success | pending | failure | error
                    raw["combined_status"] = state
                    if require_ci and state not in ("success", "pending"):
                        attention = attention or f"ci_{state}"
                else:
                    ci_status = "unknown"
                    if require_ci:
                        attention = attention or "ci_status_unavailable"

        ok = attention is None
        return GitHubEnrichment(
            owner=owner,
            repo=repo,
            branch_name=branch_name,
            pr_number=pr_number,
            pr_url=pr_url,
            head_sha=head_sha,
            ci_status=ci_status,
            ok=ok,
            attention_reason=attention,
            raw=raw,
        )
