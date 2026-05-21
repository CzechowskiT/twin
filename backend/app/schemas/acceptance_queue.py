from pydantic import BaseModel, Field


class AcceptanceRespondIn(BaseModel):
    kind: str = Field(..., description="match | interview")
    action: str = Field(..., description="accept | decline")


class AcceptanceQueueOut(BaseModel):
    interviews: list[dict]
    matches: list[dict]
    total: int
