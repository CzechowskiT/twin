"""Auto-apply result types."""

from dataclasses import dataclass
from enum import Enum


class ApplyOutcome(str, Enum):
    SUBMITTED = "submitted"
    FORM_FILLED = "form_filled"
    NEEDS_HUMAN = "needs_human"
    UNSUPPORTED = "unsupported"
    FAILED = "failed"


@dataclass(frozen=True)
class ApplyResult:
    outcome: ApplyOutcome
    message: str

    @property
    def success(self) -> bool:
        return self.outcome in (ApplyOutcome.SUBMITTED, ApplyOutcome.FORM_FILLED)
