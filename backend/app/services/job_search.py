"""Tokenized job text search for dashboard feed filters."""

from __future__ import annotations

import re
from typing import TYPE_CHECKING

from sqlalchemy import and_, or_

from app.database.models import Job

if TYPE_CHECKING:
    from sqlalchemy.orm import Query

_TOKEN_RE = re.compile(r"[\w]+", re.UNICODE)
_SEGMENT_SPLIT = re.compile(r"[,;|]+")

# Skip ultra-common glue words; keep matching focused on role/skill tokens.
_STOPWORDS = frozenset(
    {
        "a",
        "an",
        "and",
        "at",
        "for",
        "in",
        "of",
        "on",
        "or",
        "the",
        "to",
        "with",
        "w",
        "z",
        "i",
        "o",
        "na",
        "do",
        "ze",
    }
)


def tokenize_job_search(*parts: str | None) -> list[str]:
    """Lowercase unique tokens from free text and comma-separated title lists."""
    seen: set[str] = set()
    tokens: list[str] = []
    for part in parts:
        if not part or not str(part).strip():
            continue
        for segment in _SEGMENT_SPLIT.split(str(part)):
            segment = segment.strip()
            if not segment:
                continue
            for word in _TOKEN_RE.findall(segment):
                w = word.lower()
                if len(w) < 2 or w in _STOPWORDS:
                    continue
                if w in seen:
                    continue
                seen.add(w)
                tokens.append(w)
    return tokens


def job_text_token_clause(tokens: list[str]):
    """Match when any token appears in title, description, or requirements."""
    if not tokens:
        return None
    per_token = []
    for tok in tokens:
        pattern = f"%{tok}%"
        per_token.append(
            or_(
                Job.title.ilike(pattern),
                Job.description.ilike(pattern),
                Job.requirements.ilike(pattern),
            )
        )
    return or_(*per_token)


def apply_min_salary_filter(query: "Query", min_salary: int | None) -> "Query":
    """Exclude only listings with known salary below threshold; null salary passes."""
    if min_salary is None or min_salary <= 0:
        return query
    return query.filter(
        or_(
            and_(Job.salary_min.is_(None), Job.salary_max.is_(None)),
            Job.salary_max >= min_salary,
            Job.salary_min >= min_salary,
        )
    )


def has_text_search_filters(*, q: str | None, title_terms: str | None) -> bool:
    return bool(tokenize_job_search(q, title_terms))
