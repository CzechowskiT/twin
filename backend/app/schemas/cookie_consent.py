"""Browser cookie banner consent (separate from service GDPR / marketing email opt-in)."""

from datetime import datetime

from pydantic import BaseModel, Field


class CookieConsentIn(BaseModel):
    version: int = Field(ge=1, le=1)
    analytics: bool
    marketing: bool
    decided_at: datetime
    visitor_id: str = Field(min_length=8, max_length=128)


class CookieConsentOut(BaseModel):
    ok: bool = True
