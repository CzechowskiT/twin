"""Recruiter pilot token → session JWT exchange."""

from pydantic import BaseModel, Field


class RecruiterSessionExchangeIn(BaseModel):
    access_token: str = Field(..., min_length=8, max_length=512, description="Pilot access token")
    company_slug: str = Field(..., min_length=1, max_length=80)


class RecruiterSessionOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    company_slug: str
    expires_in_minutes: int
