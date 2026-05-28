"""Schema-only contract mirror for pre_apply_feedback.v1.

This module does not expose any API route by itself.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class PreApplyMissingRequirement(BaseModel):
    key: str = Field(..., min_length=1)
    severity: Literal["low", "medium", "high"]
    required: bool = True


class PreApplyImprovementSuggestion(BaseModel):
    type: str = Field(..., min_length=1)
    action: str = Field(..., min_length=1)
    priority: Literal["low", "medium", "high"]


class PreApplyEvidenceNotes(BaseModel):
    supported_skills: list[str] = []
    declared_only_skills: list[str] = []
    verification_claims: Literal["none"] = "none"
    wording: str = Field(..., min_length=1)


class PreApplyFeedbackAdjustment(BaseModel):
    signal: str = Field(..., min_length=1)
    delta: float


class PreApplyRankingSignals(BaseModel):
    base_fit: float
    feedback_adjustments: list[PreApplyFeedbackAdjustment] = []
    final_score: float


class PreApplyFeedbackV1(BaseModel):
    version: Literal["pre_apply_feedback.v1"]
    job_id: int = Field(..., ge=1)
    candidate_scope: str = Field(..., min_length=1)
    fit_summary: str = Field(..., min_length=1)
    strengths: list[str] = []
    risks: list[str] = []
    missing_requirements: list[PreApplyMissingRequirement] = []
    improvement_suggestions: list[PreApplyImprovementSuggestion] = []
    evidence_notes: PreApplyEvidenceNotes
    ranking_signals: PreApplyRankingSignals
    apply_recommendation: Literal["apply_now", "defer", "do_not_apply", "review_first"]
    confidence: Literal["low", "medium", "high"]
    human_review_required: bool
    forbidden_claims: list[str] = []
