"""Product feedback schemas."""

from datetime import datetime

from pydantic import BaseModel, Field


class ProductFeedbackIn(BaseModel):
    category: str = Field(min_length=1, max_length=32)
    rating: int = Field(ge=1, le=5)
    message: str | None = Field(default=None, max_length=4000)
    page_path: str | None = Field(default=None, max_length=500)


class ProductFeedbackOut(BaseModel):
    id: int
    category: str
    rating: int
    message: str | None
    page_path: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
