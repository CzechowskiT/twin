"""Candidate Trust Center API schemas — Wave B slice 2."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

ConsentPurpose = Literal[
    "cv_processing",
    "intro_audio_processing",
    "talent_pool",
    "profile_documents",
]
ConsentStatus = Literal["active", "withdrawn", "not_granted", "review_required"]
PrivacyRequestType = Literal[
    "correction",
    "export",
    "portability",
    "withdrawal",
    "deletion",
    "identity_review",
    "objection",
    "restriction",
]
PrivacyRequestStatus = Literal["open", "processing", "completed", "cancelled"]
PrivacyFulfillmentStatus = Literal[
    "queued", "in_progress", "fulfilled", "rejected", "cancelled"
]


class ConsentItemOut(BaseModel):
    purpose: ConsentPurpose
    status: ConsentStatus
    granted_at: datetime | None = None
    withdrawn_at: datetime | None = None
    note: str


class ConsentListOut(BaseModel):
    items: list[ConsentItemOut]
    updated_at: datetime | None = None


class ConsentGrantIn(BaseModel):
    purpose: ConsentPurpose
    idempotency_key: str | None = Field(default=None, max_length=128)


class ConsentPatchIn(BaseModel):
    purpose: ConsentPurpose
    action: Literal["grant", "withdraw"]
    idempotency_key: str | None = Field(default=None, max_length=128)


class ConsentReceiptOut(BaseModel):
    id: int
    consent_purpose: str
    action: str
    status: str
    payload: dict[str, Any]
    created_at: datetime


class ConsentReceiptListOut(BaseModel):
    items: list[ConsentReceiptOut]
    total: int


class PrivacyRequestCreateIn(BaseModel):
    request_type: PrivacyRequestType
    payload: dict[str, Any] = Field(default_factory=dict)
    idempotency_key: str | None = Field(default=None, max_length=128)


class PrivacyRequestOut(BaseModel):
    id: int
    request_type: str
    status: str
    payload: dict[str, Any]
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None = None
    fulfillment_status: str | None = None
    fulfilled_at: datetime | None = None
    fulfilled_by_user_id: int | None = None
    delivery_receipt: dict[str, Any] | None = None
    legal_hold: bool = False
    manual_processing_notice: str


class PrivacyRequestListOut(BaseModel):
    items: list[PrivacyRequestOut]
    total: int


class TrustAuditEventOut(BaseModel):
    id: int
    event_type: str
    summary: str
    metadata: dict[str, Any] | None = None
    actor: str
    created_at: datetime


class TrustAuditEventListOut(BaseModel):
    items: list[TrustAuditEventOut]
    total: int


class TrustDataSourceOut(BaseModel):
    id: str
    kind: str
    label: str
    detail: str
    last_synced_at: datetime | None = None


class TrustTimelineEventOut(BaseModel):
    id: str
    type: str
    at: datetime
    summary: str


class AccountDeleteIn(BaseModel):
    confirmation: str = Field(..., min_length=1, max_length=32)
    idempotency_key: str | None = Field(default=None, max_length=128)


class AccountDeleteOut(BaseModel):
    deleted: bool
    deleted_at: datetime
    privacy_request_id: int
    message: str


class TrustCenterOut(BaseModel):
    candidate_id: int
    display_name: str
    configured: bool
    twin_knows_summary: str
    twin_knows_items: list[str]
    data_sources: list[TrustDataSourceOut]
    consent_items: list[ConsentItemOut]
    privacy_request_counts: dict[str, int]
    audit_event_count: int
    trust_timeline: list[TrustTimelineEventOut]
    manual_processing_notice: str
    pilot_labelled: bool = True
    updated_at: datetime | None = None
