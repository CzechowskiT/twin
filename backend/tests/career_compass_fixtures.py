"""Shared career compass test fixtures."""

from __future__ import annotations

import json
from datetime import datetime, timezone

from app.database.models import Candidate, CandidateCareerCompass


def attach_complete_career_compass(
    candidate: Candidate,
    *,
    target_role: str = "Engineer",
    target_seniority: str = "senior",
) -> CandidateCareerCompass:
    """Attach an in-memory complete compass row for unit tests."""
    row = CandidateCareerCompass(
        candidate_id=candidate.id or 0,
        target_role=target_role,
        target_seniority=target_seniority,
        career_priorities=json.dumps(["Growth"]),
        next_steps=json.dumps(["Update CV"]),
        preferred_industries="[]",
        preferred_locations="[]",
        skill_gaps="[]",
        strengths="[]",
        learning_actions="[]",
        completion_status="complete",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    candidate.career_compass = row
    return row


def seed_complete_career_compass(db, candidate: Candidate) -> CandidateCareerCompass:
    """Persist a complete compass row for integration tests."""
    row = CandidateCareerCompass(
        candidate_id=candidate.id,
        target_role="Backend Engineer",
        target_seniority="senior",
        career_priorities=json.dumps(["Impact"]),
        next_steps=json.dumps(["Refresh CV"]),
        preferred_industries="[]",
        preferred_locations="[]",
        skill_gaps="[]",
        strengths="[]",
        learning_actions="[]",
        completion_status="complete",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(row)
    db.commit()
    db.refresh(candidate)
    return row
