"""Candidate skill evidence vault schemas."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

EvidenceType = Literal[
    "cv",
    "project",
    "certificate",
    "github",
    "case_study",
    "language_test",
    "assessment",
]

PrivacyClass = Literal["candidate_private", "recruiter_visible", "compliance_restricted"]


class CandidateEvidenceItemOut(BaseModel):
    id: int
    skill_name: str
    evidence_type: EvidenceType
    title: str | None = None
    note: str | None = None
    source_url: str | None = None
    privacy_class: PrivacyClass
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CandidateEvidenceItemIn(BaseModel):
    skill_name: str = Field(min_length=1, max_length=120)
    evidence_type: EvidenceType
    title: str | None = Field(default=None, max_length=200)
    note: str | None = Field(default=None, max_length=4000)
    source_url: str | None = Field(default=None, max_length=2000)
    privacy_class: PrivacyClass = "candidate_private"


class CandidateEvidenceListOut(BaseModel):
    items: list[CandidateEvidenceItemOut]
    total: int
