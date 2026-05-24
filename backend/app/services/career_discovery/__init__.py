"""Career discovery heuristics (red flags + match score)."""

from app.services.career_discovery.red_flags import (
    RedFlagHit,
    detect_red_flags,
    red_flag_summary,
    red_flags_from_job_dict,
)
from app.services.career_discovery.score import score_job_match

__all__ = [
    "RedFlagHit",
    "detect_red_flags",
    "red_flag_summary",
    "red_flags_from_job_dict",
    "score_job_match",
]
