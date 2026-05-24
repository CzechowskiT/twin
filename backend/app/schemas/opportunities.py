"""Opportunity forecast + unified feed schemas."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class ForecastJobOut(BaseModel):
    job_id: int
    title: str
    company: str
    location: str | None
    score: float
    band: str
    skill_match_percent: float
    matched_skills: list[str]
    missing_skills: list[str]
    opportunity_type: str
    learning_path: list[dict[str, str]]


class OpportunityForecastOut(BaseModel):
    perfect: list[ForecastJobOut]
    near_miss: list[ForecastJobOut]
    stretch: list[ForecastJobOut]
    totals: dict[str, int]
    scanned_jobs: int
    summary: dict[str, int]
    paywall: dict[str, str] | None = None


class UnifiedFeedItemOut(BaseModel):
    id: int
    title: str
    company: str
    location: str | None
    job_board: str
    url: str
    salary_min: int | None
    salary_max: int | None
    opportunity_type: str
    project_duration_months: int | None = None
    hourly_rate_min: int | None = None
    hourly_rate_max: int | None = None
    match_score: float | None = None
    scraped_at: str | None = None


class UnifiedFeedOut(BaseModel):
    items: list[UnifiedFeedItemOut]
    opportunity_type: str
    paywall: dict[str, str] | None = None
