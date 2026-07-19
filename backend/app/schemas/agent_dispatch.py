"""Pydantic schemas for Agent Dispatcher API."""

from __future__ import annotations

from typing import Any, Literal

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
    execution_mode: Literal["read_only", "mutating"] | None = None
    read_only: bool | None = None
    mutation_required: bool | None = None
    commit_required: bool | None = None
    pr_required: bool | None = None
    merge_required: bool | None = None
    deployment_required: bool | None = None
    production_regression_required: bool | None = None
    operator_execution_required: bool | None = None
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
        mutation_flags = (
            self.mutation_required,
            self.commit_required,
            self.pr_required,
            self.merge_required,
            self.deployment_required,
            self.production_regression_required,
            self.operator_execution_required,
        )
        explicit_read_only = self.read_only is True or self.execution_mode == "read_only"
        explicit_mutating = self.execution_mode == "mutating" or any(
            flag is True for flag in mutation_flags
        )
        mode_mismatch = (self.execution_mode == "read_only" and self.read_only is False) or (
            self.execution_mode == "mutating" and self.read_only is True
        )
        if mode_mismatch or (explicit_read_only and explicit_mutating):
            raise ValueError("invalid_execution_contract")
        return self

    def execution_contract(self) -> dict[str, Any]:
        """Return only the explicit execution fields supplied by the caller."""
        fields = (
            "execution_mode",
            "read_only",
            "mutation_required",
            "commit_required",
            "pr_required",
            "merge_required",
            "deployment_required",
            "production_regression_required",
            "operator_execution_required",
        )
        return {field: getattr(self, field) for field in fields if field in self.model_fields_set}


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
    final_status: str
    task_name: str | None = None
    repository_url: str
    base_branch: str
    execution_policy: dict[str, Any] | None = None
    execution_mode: Literal["read_only", "mutating"] | None = None
    read_only: bool | None = None
    mutation_required: bool | None = None
    operator_execution_required: bool | None = None
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
    result_merge_sha: str | None = None
    result_deployment_sha: str | None = None
    result_deployment_ids: list[int] = Field(default_factory=list)
    result_ci_status: str | None = None
    result_regression_status: str | None = None
    result_summary: str | None = None
    error_code: str | None = None
    reason_code: str | None = None
    error_message: str | None = None
    idempotency_key: str | None = None
    created_at: str | None = None
    dispatched_at: str | None = None
    finished_at: str | None = None
    github_enrichment: dict[str, Any] | None = None
    expected_artifacts: dict[str, bool] | None = None
    verified_artifacts: dict[str, bool] | None = None
