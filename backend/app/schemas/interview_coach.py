"""AI interview coach schemas — Epic 2.26 honest evaluation (no invented scores)."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class InterviewQuestionsIn(BaseModel):
    job_id: int


class InterviewQuestionsOut(BaseModel):
    questions: list[dict[str, str]]
    tips: list[str]
    source: str
    source_label: str | None = None


class CriterionOutcome(BaseModel):
    id: str
    outcome: str
    note: str | None = None


class EvaluateAnswerIn(BaseModel):
    job_id: int
    question: str = Field(..., min_length=5, max_length=2000)
    answer: str = Field(..., min_length=1, max_length=8000)
    allow_deterministic_heuristics: bool = False


class EvaluateAnswerOut(BaseModel):
    evaluation_status: str
    score: int | None = None
    score_available: bool = False
    criteria: list[CriterionOutcome] = Field(default_factory=list)
    strengths: list[str] = Field(default_factory=list)
    improvements: list[str] = Field(default_factory=list)
    sample_better_answer: str | None = None
    source: str
    source_label: str | None = None
    degraded: bool = False
    legacy_score_ignored: bool | None = None
