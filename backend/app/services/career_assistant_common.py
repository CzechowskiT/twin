"""Shared helpers for AI career assistant services."""

from __future__ import annotations

import json
import re
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database.models import Application, Candidate, Job, ScheduledInterview
from app.services.anthropic_client import get_anthropic_client, is_anthropic_configured


def job_posting_text(job: Job) -> str:
    """Concatenate job fields for prompts and keyword scoring."""
    chunks = [job.title or "", job.company or "", job.description or "", job.requirements or ""]
    return "\n\n".join(c for c in chunks if c).strip()


def keyword_match_percent(cv_text: str, job_text: str) -> float:
    """Rough ATS overlap score (0–100) from shared tokens."""
    cv_tokens = {w for w in re.findall(r"\w{4,}", (cv_text or "").lower())}
    job_tokens = {w for w in re.findall(r"\w{4,}", (job_text or "").lower())}
    if not job_tokens:
        return 0.0
    overlap = len(cv_tokens & job_tokens) / len(job_tokens)
    return round(min(100.0, overlap * 100.0), 1)


def get_candidate_for_user(db: Session, user_id: int) -> Candidate:
    row = db.query(Candidate).filter(Candidate.user_id == user_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate profile not found")
    return row


def get_application_for_user(db: Session, user_id: int, application_id: int) -> Application:
    candidate = get_candidate_for_user(db, user_id)
    app = (
        db.query(Application)
        .filter(Application.id == application_id, Application.candidate_id == candidate.id)
        .first()
    )
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    return app


def get_job_for_application(db: Session, app: Application) -> Job:
    job = db.query(Job).filter(Job.id == app.job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    return job


def get_interview_for_user(db: Session, user_id: int, interview_id: int) -> ScheduledInterview:
    row = (
        db.query(ScheduledInterview)
        .filter(ScheduledInterview.id == interview_id, ScheduledInterview.user_id == user_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found")
    return row


def parse_claude_json(text: str) -> dict[str, Any] | None:
    """Extract JSON object from Claude response (fenced or raw)."""
    raw = (text or "").strip()
    if "```json" in raw:
        raw = raw.split("```json", 1)[1].split("```", 1)[0]
    elif "```" in raw:
        raw = raw.split("```", 1)[1].split("```", 1)[0]
    raw = raw.strip()
    start = raw.find("{")
    end = raw.rfind("}")
    if start < 0 or end <= start:
        return None
    try:
        data = json.loads(raw[start : end + 1])
        return data if isinstance(data, dict) else None
    except json.JSONDecodeError:
        return None


def call_claude_json(prompt: str, *, max_tokens: int = 2500) -> dict[str, Any] | None:
    """Sync Anthropic call; returns parsed JSON dict or None."""
    if not is_anthropic_configured():
        return None
    client = get_anthropic_client()
    if not client:
        return None
    try:
        msg = client.messages.create(
            model=get_settings().anthropic_model,
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}],
        )
        raw_out = msg.content[0].text if msg.content else ""
        return parse_claude_json(raw_out)
    except Exception:
        return None
