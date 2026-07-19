"""Resolve API deployment alignment against the live repository head."""

from __future__ import annotations

from dataclasses import dataclass
from urllib.parse import quote

import httpx

from app.config import Settings
from app.services.agent_dispatch.github_enricher import parse_github_repo

_GITHUB_API = "https://api.github.com"
_GITHUB_API_VERSION = "2026-03-10"
_BACKEND_PATHS = ("backend/", "deploy/", ".env.railway.example")


@dataclass(frozen=True)
class DeploymentAlignment:
    """Evidence-backed relation between the API deploy and repository head."""

    repo_head: str | None
    status: str
    reason: str


def _component_status(
    api_sha: str,
    repo_head: str,
    comparison: dict,
) -> DeploymentAlignment:
    relation = comparison.get("status")
    files = comparison.get("files") or []
    if relation == "identical" or api_sha == repo_head:
        return DeploymentAlignment(repo_head, "aligned", "api_matches_repo_head")
    if relation != "ahead":
        return DeploymentAlignment(repo_head, "drift", f"git_history_{relation or 'unknown'}")
    if len(files) >= 300:
        return DeploymentAlignment(repo_head, "unknown", "github_compare_file_limit")
    changed = {str(item.get("filename") or "") for item in files}
    if any(path == prefix.rstrip("/") or path.startswith(prefix) for path in changed for prefix in _BACKEND_PATHS):
        return DeploymentAlignment(repo_head, "drift", "backend_changes_not_deployed")
    return DeploymentAlignment(repo_head, "component_aligned", "backend_unchanged_since_api_deploy")


def resolve_deployment_alignment(
    settings: Settings,
    api_sha: str | None,
    *,
    transport: httpx.BaseTransport | None = None,
) -> DeploymentAlignment:
    """Use GitHub branch and compare APIs; return unknown when evidence is unavailable."""
    if not api_sha:
        return DeploymentAlignment(None, "unknown", "api_sha_missing")
    parsed = parse_github_repo(
        (settings.agent_dispatch_repo_allowlist or "").split(",")[0].strip()
    )
    branch = (settings.agent_dispatch_base_branch_allowlist or "").split(",")[0].strip()
    token = (settings.agent_dispatch_github_token or "").strip()
    if not parsed or not branch or not token:
        return DeploymentAlignment(None, "unknown", "github_alignment_not_configured")
    owner, repo = parsed
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": _GITHUB_API_VERSION,
        "User-Agent": "twin-founder-command",
    }
    try:
        with httpx.Client(
            base_url=_GITHUB_API,
            headers=headers,
            timeout=10.0,
            transport=transport,
        ) as client:
            branch_response = client.get(
                f"/repos/{owner}/{repo}/branches/{quote(branch, safe='')}"
            )
            branch_response.raise_for_status()
            repo_head = str((branch_response.json().get("commit") or {}).get("sha") or "")
            compare_response = client.get(
                f"/repos/{owner}/{repo}/compare/{api_sha}...{repo_head}"
            )
            compare_response.raise_for_status()
        if not repo_head:
            return DeploymentAlignment(None, "unknown", "repo_head_missing")
        return _component_status(api_sha, repo_head, compare_response.json())
    except (httpx.HTTPError, TypeError, ValueError):
        return DeploymentAlignment(None, "unknown", "github_alignment_unavailable")
