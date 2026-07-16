"""Pydantic schemas for Agent Dispatcher API."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class CreateDispatchRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=200_000)
    repository_url: str = Field(..., min_length=8, max_length=512)
    base_branch: str = Field(default="cursor/phase1-monorepo-scaffold", min_length=1, max_length=255)
    auto_create_pr: bool = True
    branch_name: str | None = Field(default=None, max_length=255)
    model_id: str | None = Field(default=None, max_length=128)
    idempotency_key: str | None = Field(default=None, max_length=128)
    metadata: dict[str, Any] | None = None
    dispatch_now: bool = True


class ForceUnlockRequest(BaseModel):
    repository_url: str
    base_branch: str


class DispatchRunResponse(BaseModel):
    id: str
    status: str
    repository_url: str
    base_branch: str
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
