"""Pydantic schemas for Agent Dispatcher API."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field, field_validator, model_validator


class ExecutionPolicy(BaseModel):
    """Hard production policy — False values are rejected (no_admin_override)."""

    single_active_run: bool = True
    manual_merge_only: bool = True
    no_admin_override: bool = True
    no_auto_merge: bool = True
    final_report_once: bool = True

    @field_validator(
        "single_active_run",
        "manual_merge_only",
        "no_admin_override",
        "no_auto_merge",
        "final_report_once",
    )
    @classmethod
    def _must_stay_true(cls, v: bool, info) -> bool:  # noqa: ANN001
        if v is not True:
            raise ValueError(f"execution_policy.{info.field_name} must be true")
        return v


class CreateDispatchRequest(BaseModel):
    task_name: str = Field(..., min_length=1, max_length=128)
    prompt: str = Field(..., min_length=1, max_length=200_000)
    # Accept both `repository` (contract) and `repository_url` (legacy alias).
    repository: str | None = Field(default=None, min_length=8, max_length=512)
    repository_url: str | None = Field(default=None, min_length=8, max_length=512)
    base_branch: str = Field(default="cursor/phase1-monorepo-scaffold", min_length=1, max_length=255)
    execution_policy: ExecutionPolicy = Field(default_factory=ExecutionPolicy)
    # Opt-in only; no_auto_merge always blocks merge automation; PR create defaults off.
    auto_create_pr: bool = False
    branch_name: str | None = Field(default=None, max_length=255)
    model_id: str | None = Field(default=None, max_length=128)
    idempotency_key: str | None = Field(default=None, max_length=128)
    metadata: dict[str, Any] | None = None
    dispatch_now: bool = True

    @model_validator(mode="after")
    def _resolve_repository(self) -> CreateDispatchRequest:
        repo = (self.repository or self.repository_url or "").strip()
        if not repo:
            raise ValueError("repository (or repository_url) is required")
        self.repository = repo
        self.repository_url = repo
        # no_auto_merge ⇒ never open PR automatically unless caller opts in AND
        # we still never enable GitHub auto-merge (enricher/merge APIs absent).
        if self.execution_policy.no_auto_merge and self.auto_create_pr:
            # Allow Cursor autoCreatePR for visibility, but document manual merge only.
            # Hard ban would be: self.auto_create_pr = False — keep opt-in for PR open
            # while forbidding merge automation elsewhere.
            pass
        return self


class ForceUnlockRequest(BaseModel):
    repository_url: str
    base_branch: str


class OperatorRunRequest(BaseModel):
    correlation_id: str | None = Field(default=None, min_length=8, max_length=64)


class OperatorCreatePullRequestRequest(OperatorRunRequest):
    title: str = Field(..., min_length=1, max_length=256)
    body: str = Field(default="", max_length=65_536)


class DispatchRunResponse(BaseModel):
    id: str
    status: str
    task_name: str | None = None
    repository_url: str
    base_branch: str
    execution_policy: dict[str, Any] | None = None
    auto_create_pr: bool = False
    prompt_hash: str
    prompt_preview: str | None = None
    cursor_api_version: str | None = None
    cursor_agent_id: str | None = None
    cursor_run_id: str | None = None
    cursor_status: str | None = None
    cursor_agent_url: str | None = None
    result_branch: str | None = None
    result_pr_url: str | None = None
    result_head_sha: str | None = None
    result_ci_status: str | None = None
    result_summary: str | None = None
    error_code: str | None = None
    error_message: str | None = None
    idempotency_key: str | None = None
    created_at: str | None = None
    dispatched_at: str | None = None
    finished_at: str | None = None
    github_enrichment: dict[str, Any] | None = None
    expected_artifacts: dict[str, bool] | None = None
    verified_artifacts: dict[str, bool] | None = None
