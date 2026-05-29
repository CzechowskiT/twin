"""AI interview coach schemas."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class InterviewQuestionsIn(BaseModel):
    job_id: int


class InterviewQuestionsOut(BaseModel):
    questions: list[dict[str, str]]
    tips: list[str]
    source: str


class EvaluateAnswerIn(BaseModel):
    job_id: int
    question: str = Field(..., min_length=5, max_length=2000)
    answer: str = Field(..., min_length=10, max_length=8000)


class EvaluateAnswerOut(BaseModel):
    score: int
    strengths: list[str]
    improvements: list[str]
    sample_better_answer: str | None = None
    source: str
