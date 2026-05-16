"""Public talent pool (anonymous recruiter preview) schemas."""

from pydantic import BaseModel, Field


class AnonymousTalentPoolItemOut(BaseModel):
    public_id: str = Field(min_length=20, max_length=20)
    skills: list[str] = Field(default_factory=list)
    validated: bool
    match_percent: int = Field(ge=0, le=100)


class AnonymousTalentPoolListOut(BaseModel):
    items: list[AnonymousTalentPoolItemOut]
    total: int = Field(ge=0)
