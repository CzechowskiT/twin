"""Recruiter workspace activation API schemas — Wave C slice 1."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class RecruiterActivationStepOut(BaseModel):
    id: str
    label_key: str
    completed: bool
    completed_at: datetime | None = None


class RecruiterActivationOut(BaseModel):
    company_slug: str
    configured: bool = False
    workspace_connected: bool = False
    queue_loaded: bool = False
    first_decision: bool = False
    activation_complete: bool = False
    first_decision_action: str | None = None
    workspace_connected_at: datetime | None = None
    queue_loaded_at: datetime | None = None
    first_decision_at: datetime | None = None
    activation_completed_at: datetime | None = None
    completion_percent: int = Field(ge=0, le=100)
    completed_steps: list[str] = Field(default_factory=list)
    remaining_steps: list[str] = Field(default_factory=list)
    next_action: str
    next_action_href: str
    steps: list[RecruiterActivationStepOut] = Field(default_factory=list)
    pilot_status: str = "PILOT"
    browser_smoke_status: str = "NEEDS_FOUNDER_AUTH_SMOKE"
