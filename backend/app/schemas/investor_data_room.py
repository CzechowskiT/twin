"""Investor data room upload stub schemas."""

from datetime import datetime

from pydantic import BaseModel, Field


class DataRoomUploadIn(BaseModel):
    category: str = Field(pattern="^(cap_table|financials|legal|other)$")
    filename: str = Field(min_length=1, max_length=255)
    content_type: str = Field(min_length=3, max_length=128)
    size_bytes: int = Field(ge=1, le=26_214_400)
    checksum_sha256: str | None = Field(default=None, min_length=64, max_length=64)


class DataRoomUploadOut(BaseModel):
    id: int
    category: str
    filename: str
    content_type: str
    size_bytes: int
    status: str
    storage_note: str
    created_at: datetime

    model_config = {"from_attributes": True}
