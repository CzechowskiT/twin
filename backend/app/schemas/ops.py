"""Ops API schemas."""

from datetime import datetime

from pydantic import BaseModel


class AutoApplyLastRunOut(BaseModel):
    id: int
    started_at: datetime
    finished_at: datetime | None
    total_users_processed: int
    total_applications_submitted: int
    total_applications_failed: int

    model_config = {"from_attributes": True}
