"""Pydantic schemas for Founder Command Center."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


class CreateFounderCommandRequest(BaseModel):
    direction: str = Field(..., min_length=3, max_length=8000)
    action: Literal["start", "analyze", "continue"] = "start"
    autonomy_level: int = Field(default=3, ge=1, le=4)
    max_batches: int | None = Field(default=None, ge=1, le=50)
    max_runtime_minutes: int | None = Field(default=None, ge=5, le=24 * 60)
    idempotency_key: str | None = Field(default=None, max_length=128)

    @field_validator("direction")
    @classmethod
    def _strip(cls, v: str) -> str:
        return v.strip()


class ChangeDirectionRequest(BaseModel):
    direction: str = Field(..., min_length=3, max_length=8000)


class DecisionResolveRequest(BaseModel):
    approve: bool
    note: str | None = Field(default=None, max_length=500)


class FounderCommandActionRequest(BaseModel):
    note: str | None = Field(default=None, max_length=500)
