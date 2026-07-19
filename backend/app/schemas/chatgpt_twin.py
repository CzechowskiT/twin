"""Request schemas for Custom GPT Twin Product Operator Actions."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator


class CreateTwinCommandRequest(BaseModel):
    direction: str = Field(..., min_length=3, max_length=4000)
    action: Literal["start", "analyze", "continue"] = "start"
    autonomy_level: int | None = Field(default=None, ge=1, le=4)
    max_batches: int | None = Field(default=None, ge=1, le=50)
    max_runtime_minutes: int | None = Field(default=None, ge=5, le=24 * 60)
    approval_policy: str = "founder_decisions_and_high_risk_only"
    idempotency_key: str | None = Field(default=None, max_length=128)

    @field_validator("direction")
    @classmethod
    def _strip_direction(cls, v: str) -> str:
        return v.strip()

    @field_validator("approval_policy")
    @classmethod
    def _policy(cls, v: str) -> str:
        allowed = {"founder_decisions_and_high_risk_only", "always_ask", "auto_safe_only"}
        raw = (v or "").strip() or "founder_decisions_and_high_risk_only"
        if raw not in allowed:
            raise ValueError(f"approval_policy must be one of {sorted(allowed)}")
        return raw


class CancelTwinCommandRequest(BaseModel):
    reason: str = Field(..., min_length=3, max_length=500)
    confirmation: bool = False

    @field_validator("reason")
    @classmethod
    def _strip_reason(cls, v: str) -> str:
        return v.strip()


class ChangeTwinDirectionRequest(BaseModel):
    direction: str = Field(..., min_length=3, max_length=4000)

    @field_validator("direction")
    @classmethod
    def _strip(cls, v: str) -> str:
        return v.strip()


class DecisionNoteRequest(BaseModel):
    note: str | None = Field(default=None, max_length=500)


class ModifyTwinDecisionRequest(BaseModel):
    modification: str = Field(..., min_length=3, max_length=4000)
    note: str | None = Field(default=None, max_length=500)

    @field_validator("modification")
    @classmethod
    def _strip_mod(cls, v: str) -> str:
        return v.strip()
