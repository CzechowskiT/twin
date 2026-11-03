"""Adaptive Career Intelligence — memory, prefs, ranking, health, learning loop.

Extends Career Copilot 2.0. Never silently overwrites history.
Never protected attributes. Never fabricated market/salary.
Every generation reuses accumulated memory (WS10).
"""

from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import (
    Application,
    Candidate,
    CandidateCareerAction,
    CandidateCareerCompass,
    CandidateCareerDirection,
    CandidateCareerGoal,
    CandidateCareerGraph,
    CandidateCareerHealthSnapshot,
    CandidateCareerScenario,
    CandidateCareerTimelineEvent,
    CandidateCopilotMemory,
    CandidateCopilotPreference,
    CandidateCopilotRecommendation,
    CandidateLearningLoopEntry,
    CandidateSkillEvolution,
)
from app.services import career_copilot as cc
from app.services.ai_intel_validation import kill_switch_engaged

# Preference keys allowed — never protected attrs
ALLOWED_PREF_KEYS = frozenset(
    {
        "work_mode",
        "avoids_management",
        "prefers_startups",
        "prefers_enterprise",
        "industry",
        "salary_sensitivity",
        "learning_style",
        "work_life_balance",
        "remote_preference",
        "mobility",
    }
)

FORBIDDEN_PREF_KEYS = frozenset(
    {
        "age",
        "gender",
        "ethnicity",
        "race",
        "religion",
        "disability",
        "nationality",
        "marital_status",
        "pregnancy",
        "sexual_orientation",
    }
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def record_memory(
    db: Session,
    *,
    candidate_id: int,
    memory_key: str,
    kind: str,
    title: str,
    body: dict[str, Any] | None = None,
    source: str = "copilot",
    confidence: str = "medium",
    claim_kind: str = cc.CLAIM_FACT,
    edit_existing: bool = False,
) -> CandidateCopilotMemory:
    """Append-only with versioning — edit creates new version, archives prior."""
    key = memory_key.strip()[:128]
    now = _utcnow()
    latest = (
        db.query(CandidateCopilotMemory)
        .filter(
            CandidateCopilotMemory.candidate_id == candidate_id,
            CandidateCopilotMemory.memory_key == key,
            CandidateCopilotMemory.archived_at.is_(None),
        )
        .order_by(CandidateCopilotMemory.version.desc())
        .first()
    )
    if latest is not None and not edit_existing:
        # Idempotent: same key active — return without overwrite
        return latest
    ver = int(latest.version) + 1 if latest else 1
    row = CandidateCopilotMemory(
        candidate_id=candidate_id,
        memory_key=key,
        kind=(kind or "event")[:64],
        title=title[:300],
        body_json=cc._dumps(body or {}),
        source=source[:64],
        confidence=confidence[:16],
        claim_kind=claim_kind[:32],
        version=ver,
        created_at=now,
        updated_at=now,
        edited_at=now if latest else None,
    )
    db.add(row)
    db.flush()
    if latest is not None:
        latest.archived_at = now
        latest.superseded_by_id = row.id
        latest.updated_at = now
        db.add(latest)
    db.commit()
    db.refresh(row)
    add_timeline_event(
        db,
        candidate_id=candidate_id,
        event_type=f"memory:{kind}",
        title=title[:300],
        payload={"memory_id": row.id, "memory_key": key, "version": ver},
        claim_kind=claim_kind,
    )
    return row


def list_memories(db: Session, *, candidate_id: int, include_archived: bool = False) -> list[dict]:
    q = db.query(CandidateCopilotMemory).filter(CandidateCopilotMemory.candidate_id == candidate_id)
    if not include_archived:
        q = q.filter(CandidateCopilotMemory.archived_at.is_(None))
    rows = q.order_by(CandidateCopilotMemory.id.desc()).limit(100).all()
    return [
        {
            "id": r.id,
            "memory_key": r.memory_key,
            "kind": r.kind,
            "title": r.title,
            "body": cc._loads(r.body_json, {}),
            "source": r.source,
            "confidence": r.confidence,
            "claim_kind": r.claim_kind,
            "version": r.version,
            "archived_at": r.archived_at.isoformat() + "Z" if r.archived_at else None,
            "editable": True,
            "created_at": r.created_at.isoformat() + "Z" if r.created_at else None,
        }
        for r in rows
    ]


def edit_memory(
    db: Session,
    *,
    candidate_id: int,
    memory_id: int,
    title: str | None = None,
    body: dict | None = None,
) -> CandidateCopilotMemory:
    row = (
        db.query(CandidateCopilotMemory)
        .filter(
            CandidateCopilotMemory.id == memory_id,
            CandidateCopilotMemory.candidate_id == candidate_id,
            CandidateCopilotMemory.archived_at.is_(None),
        )
        .one_or_none()
    )
    if row is None:
        raise ValueError("memory_not_found")
    return record_memory(
        db,
        candidate_id=candidate_id,
        memory_key=row.memory_key,
        kind=row.kind,
        title=title or row.title,
        body=body if body is not None else cc._loads(row.body_json, {}),
        source=row.source,
        confidence=row.confidence,
        claim_kind=row.claim_kind,
        edit_existing=True,
    )


def add_timeline_event(
    db: Session,
    *,
    candidate_id: int,
    event_type: str,
    title: str,
    payload: dict | None = None,
    claim_kind: str = cc.CLAIM_FACT,
    occurred_at: datetime | None = None,
) -> CandidateCareerTimelineEvent:
    row = CandidateCareerTimelineEvent(
        candidate_id=candidate_id,
        event_type=event_type[:64],
        title=title[:300],
        payload_json=cc._dumps(payload or {}),
        claim_kind=claim_kind[:32],
        occurred_at=occurred_at or _utcnow(),
        created_at=_utcnow(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def list_timeline(db: Session, *, candidate_id: int) -> list[dict]:
    rows = (
        db.query(CandidateCareerTimelineEvent)
        .filter(
            CandidateCareerTimelineEvent.candidate_id == candidate_id,
            CandidateCareerTimelineEvent.archived_at.is_(None),
        )
        .order_by(CandidateCareerTimelineEvent.occurred_at.desc())
        .limit(100)
        .all()
    )
    return [
        {
            "id": r.id,
            "event_type": r.event_type,
            "title": r.title,
            "payload": cc._loads(r.payload_json, {}),
            "claim_kind": r.claim_kind,
            "occurred_at": r.occurred_at.isoformat() + "Z" if r.occurred_at else None,
        }
        for r in rows
    ]


def infer_preferences(db: Session, *, candidate_id: int) -> list[CandidateCopilotPreference]:
    """Infer ONLY from explicit behavior / compass — never protected attrs."""
    compass = (
        db.query(CandidateCareerCompass)
        .filter(CandidateCareerCompass.candidate_id == candidate_id)
        .one_or_none()
    )
    recs = (
        db.query(CandidateCopilotRecommendation)
        .filter(CandidateCopilotRecommendation.candidate_id == candidate_id)
        .all()
    )
    dirs = (
        db.query(CandidateCareerDirection)
        .filter(CandidateCareerDirection.candidate_id == candidate_id)
        .all()
    )
    inferences: list[tuple[str, Any, str, list[str], str]] = []

    if compass and compass.work_mode:
        inferences.append(
            (
                "work_mode",
                {"value": compass.work_mode},
                "high",
                ["career_compass.work_mode"],
                cc.CLAIM_FACT,
            )
        )
        if compass.work_mode == "remote":
            inferences.append(
                (
                    "remote_preference",
                    {"prefers_remote": True},
                    "high",
                    ["career_compass.work_mode"],
                    cc.CLAIM_FACT,
                )
            )

    rejected_mgmt = any(d.path_key == "engineering_manager" and d.status == "rejected" for d in dirs)
    if rejected_mgmt:
        inferences.append(
            (
                "avoids_management",
                {"value": True},
                "medium",
                ["direction:engineering_manager:rejected"],
                cc.CLAIM_INFERENCE,
            )
        )

    accepted_freelance = any(d.path_key == "freelance" and d.status == "accepted" for d in dirs)
    if accepted_freelance:
        inferences.append(
            (
                "prefers_startups",
                {"value": "possible_independence"},
                "low",
                ["direction:freelance:accepted"],
                cc.CLAIM_INFERENCE,
            )
        )

    industries = cc._loads(compass.preferred_industries, []) if compass else []
    if industries:
        inferences.append(
            (
                "industry",
                {"values": industries[:10]},
                "high",
                ["career_compass.preferred_industries"],
                cc.CLAIM_FACT,
            )
        )

    if compass and (
        compass.salary_expectation_min is not None or compass.salary_expectation_max is not None
    ):
        inferences.append(
            (
                "salary_sensitivity",
                {
                    "min": compass.salary_expectation_min,
                    "max": compass.salary_expectation_max,
                    "currency": compass.salary_currency,
                },
                "medium",
                ["career_compass.salary"],
                cc.CLAIM_FACT,
            )
        )

    # Rec acceptance rate → learning style proxy (weak)
    accepted = sum(1 for r in recs if r.status == "accepted")
    rejected = sum(1 for r in recs if r.status == "rejected")
    if accepted + rejected >= 2:
        style = "selective" if rejected > accepted else "exploratory"
        inferences.append(
            (
                "learning_style",
                {"style": style, "accepted": accepted, "rejected": rejected},
                "low",
                ["recommendation_memory"],
                cc.CLAIM_INFERENCE,
            )
        )

    out: list[CandidateCopilotPreference] = []
    now = _utcnow()
    for key, value, conf, evidence, claim in inferences:
        if key in FORBIDDEN_PREF_KEYS or key not in ALLOWED_PREF_KEYS:
            continue
        row = (
            db.query(CandidateCopilotPreference)
            .filter(
                CandidateCopilotPreference.candidate_id == candidate_id,
                CandidateCopilotPreference.pref_key == key,
            )
            .one_or_none()
        )
        if row and row.user_override:
            out.append(row)
            continue
        if row is None:
            row = CandidateCopilotPreference(
                candidate_id=candidate_id,
                pref_key=key,
                created_at=now,
            )
            db.add(row)
        row.value_json = cc._dumps(value)
        row.confidence = conf
        row.evidence_json = cc._dumps(evidence)
        row.claim_kind = claim
        row.editable = True
        row.updated_at = now
        db.add(row)
        out.append(row)
    db.commit()
    for r in out:
        db.refresh(r)
    return out


def set_preference_override(
    db: Session,
    *,
    candidate_id: int,
    pref_key: str,
    value: dict[str, Any],
) -> CandidateCopilotPreference:
    if pref_key in FORBIDDEN_PREF_KEYS:
        raise ValueError("forbidden_preference_key")
    if pref_key not in ALLOWED_PREF_KEYS:
        raise ValueError("unknown_preference_key")
    now = _utcnow()
    row = (
        db.query(CandidateCopilotPreference)
        .filter(
            CandidateCopilotPreference.candidate_id == candidate_id,
            CandidateCopilotPreference.pref_key == pref_key,
        )
        .one_or_none()
    )
    if row is None:
        row = CandidateCopilotPreference(
            candidate_id=candidate_id, pref_key=pref_key, created_at=now
        )
        db.add(row)
    row.value_json = cc._dumps(value)
    row.user_override = True
    row.claim_kind = cc.CLAIM_FACT
    row.confidence = "high"
    row.evidence_json = cc._dumps(["user_override"])
    row.updated_at = now
    db.add(row)
    db.commit()
    db.refresh(row)
    record_memory(
        db,
        candidate_id=candidate_id,
        memory_key=f"pref_override:{pref_key}",
        kind="preference_override",
        title=f"Preference override: {pref_key}",
        body={"pref_key": pref_key, "value": value},
        claim_kind=cc.CLAIM_FACT,
        edit_existing=True,
    )
    return row


def rank_recommendations(db: Session, *, candidate_id: int) -> list[dict[str, Any]]:
    """Adaptive ranking with explicit explain factors."""
    prefs = {
        p.pref_key: cc._loads(p.value_json, {})
        for p in db.query(CandidateCopilotPreference)
        .filter(
            CandidateCopilotPreference.candidate_id == candidate_id,
            CandidateCopilotPreference.archived_at.is_(None),
        )
        .all()
    }
    goals = (
        db.query(CandidateCareerGoal)
        .filter(
            CandidateCareerGoal.candidate_id == candidate_id,
            CandidateCareerGoal.status == "active",
        )
        .all()
    )
    recs = (
        db.query(CandidateCopilotRecommendation)
        .filter(CandidateCopilotRecommendation.candidate_id == candidate_id)
        .all()
    )
    ranked = []
    for r in recs:
        if r.status in {"rejected", "ignored"}:
            continue
        score = 40.0
        factors: list[dict] = []
        # Freshness
        score += 10
        factors.append({"factor": "freshness", "delta": 10, "why": "Active recommendation"})
        # Goal alignment
        if goals and any(
            (g.target_role or "").lower() in (r.title or "").lower()
            or (r.title or "").lower() in (g.target_role or "").lower()
            for g in goals
            if g.target_role
        ):
            score += 20
            factors.append({"factor": "goal_alignment", "delta": 20, "why": "Matches active goal target"})
        # Preference: avoid management
        if prefs.get("avoids_management", {}).get("value") and "manager" in (r.title or "").lower():
            score -= 25
            factors.append({"factor": "pref_avoids_management", "delta": -25, "why": "User rejected EM path"})
        # Acceptance history boosts similar kinds
        if r.status == "accepted":
            score += 15
            factors.append({"factor": "already_accepted", "delta": 15, "why": "Previously accepted"})
        # Confidence
        conf_boost = {"high": 10, "medium": 5, "low": 0}.get(r.confidence or "low", 0)
        score += conf_boost
        factors.append({"factor": "confidence", "delta": conf_boost, "why": f"Confidence={r.confidence}"})
        # Market: never invent — UNKNOWN contributes 0
        factors.append(
            {
                "factor": "market",
                "delta": 0,
                "why": "Market signals UNKNOWN — not fabricated",
                "claim": cc.CLAIM_UNKNOWN,
            }
        )
        ranked.append(
            {
                "id": r.id,
                "rec_key": r.rec_key,
                "title": r.title,
                "status": r.status,
                "rank_score": round(score, 1),
                "claim_kind": r.claim_kind,
                "confidence": r.confidence,
                "ranking_explain": {
                    "factors": factors,
                    "inputs": ["goals", "preferences", "recommendation_memory", "confidence"],
                    "unknowns": ["live_market_demand", "salary_band"],
                },
            }
        )
    ranked.sort(key=lambda x: (-x["rank_score"], x["rec_key"]))
    return ranked


def opportunity_intelligence(
    db: Session,
    *,
    candidate_id: int,
    opportunity_title: str,
    required_skills: list[str] | None = None,
) -> dict[str, Any]:
    """Per-opportunity fit analysis — unknowns when evidence missing."""
    cand = db.query(Candidate).filter(Candidate.id == candidate_id).one()
    skills = {s.lower() for s in cc._skills_from_candidate(cand)}
    req = [str(s).strip() for s in (required_skills or []) if str(s).strip()][:20]
    matched = [s for s in req if s.lower() in skills or any(s.lower() in sk for sk in skills)]
    missing = [s for s in req if s not in matched]
    graph = (
        db.query(CandidateCareerGraph)
        .filter(CandidateCareerGraph.candidate_id == candidate_id)
        .one_or_none()
    )
    target = None
    if graph:
        target = ((cc._loads(graph.graph_json, {}) or {}).get("goals") or {}).get("target_role")
    fit = "unknown"
    if req:
        ratio = len(matched) / max(len(req), 1)
        fit = "strong" if ratio >= 0.7 else ("partial" if ratio >= 0.35 else "weak")
    else:
        fit = "unknown"
    return {
        "schema": "twin.opportunity_intelligence/v1",
        "opportunity_title": opportunity_title[:200],
        "fit": fit,
        "strengths": matched[:10],
        "risks": missing[:10],
        "missing_skills": missing[:10],
        "prep_effort": "UNKNOWN" if not req else ("low" if len(missing) <= 1 else "medium"),
        "interview_readiness": "UNKNOWN",
        "confidence": "medium" if req else "low",
        "unknowns": [
            "recruiter_intent",
            "company_strategy",
            "salary_band",
            *([] if req else ["required_skills"]),
        ],
        "claims": [
            cc._claim(
                cc.CLAIM_INFERENCE if req else cc.CLAIM_UNKNOWN,
                f"Fit={fit} vs target={target or 'unset'}",
                ["profile_skills", "opportunity_requirements"] if req else [],
                "medium" if req else "low",
            ),
            cc._claim(cc.CLAIM_UNKNOWN, "Interview readiness not scored without practice data"),
            cc._claim(cc.CLAIM_UNKNOWN, "Salary/recruiter intent never invented"),
        ],
        "kpi_excluded": True,
    }


def refresh_skill_evolution(db: Session, *, candidate_id: int) -> list[dict]:
    cand = db.query(Candidate).filter(Candidate.id == candidate_id).one()
    skills = cc._skills_from_candidate(cand)
    compass = (
        db.query(CandidateCareerCompass)
        .filter(CandidateCareerCompass.candidate_id == candidate_id)
        .one_or_none()
    )
    gaps = cc._loads(compass.skill_gaps, []) if compass else []
    now = _utcnow()
    out = []
    for skill in skills[:30]:
        status = "stable"
        evidence = ["profile_skills"]
        exercise = None
        conf = "medium"
        if any(skill.lower() in str(g).lower() or str(g).lower() in skill.lower() for g in gaps):
            status = "needs_practice"
            evidence.append("compass.skill_gaps")
            exercise = f"Build a small artifact demonstrating: {skill}"
            conf = "medium"
        row = (
            db.query(CandidateSkillEvolution)
            .filter(
                CandidateSkillEvolution.candidate_id == candidate_id,
                CandidateSkillEvolution.skill == skill[:120],
            )
            .one_or_none()
        )
        if row is None:
            row = CandidateSkillEvolution(
                candidate_id=candidate_id, skill=skill[:120], created_at=now
            )
            db.add(row)
        row.status = status
        row.evidence_json = cc._dumps(evidence)
        row.next_exercise = exercise
        row.confidence = conf
        row.claim_kind = cc.CLAIM_INFERENCE
        row.updated_at = now
        db.add(row)
        out.append(row)
    for g in gaps[:10]:
        gskill = str(g)[:120]
        if any(gskill.lower() == s.lower() for s in skills):
            continue
        row = (
            db.query(CandidateSkillEvolution)
            .filter(
                CandidateSkillEvolution.candidate_id == candidate_id,
                CandidateSkillEvolution.skill == gskill,
            )
            .one_or_none()
        )
        if row is None:
            row = CandidateSkillEvolution(candidate_id=candidate_id, skill=gskill, created_at=now)
            db.add(row)
        row.status = "missing"
        row.evidence_json = cc._dumps(["compass.skill_gaps"])
        row.next_exercise = f"Practice exercise for missing skill: {gskill}"
        row.confidence = "medium"
        row.claim_kind = cc.CLAIM_FACT
        row.updated_at = now
        db.add(row)
        out.append(row)
    db.commit()
    return [
        {
            "skill": r.skill,
            "status": r.status,
            "evidence": cc._loads(r.evidence_json, []),
            "next_exercise": r.next_exercise,
            "confidence": r.confidence,
            "claim_kind": r.claim_kind,
        }
        for r in out
    ]


def compute_health_score(db: Session, *, candidate_id: int, force: bool = False) -> dict[str, Any]:
    """Explainable multi-dimension health — every component explained."""
    if not force:
        latest = (
            db.query(CandidateCareerHealthSnapshot)
            .filter(CandidateCareerHealthSnapshot.candidate_id == candidate_id)
            .order_by(CandidateCareerHealthSnapshot.id.desc())
            .first()
        )
        if latest is not None:
            dims = cc._loads(latest.explanations_json, {})
            return {
                "schema": "twin.career_health/v1",
                "overall_score": latest.overall_score,
                "dimensions": dims,
                "confidence": latest.confidence,
                "snapshot_id": latest.id,
                "ai_kill_switch": kill_switch_engaged(),
                "kpi_excluded": True,
                "cached": True,
                "note": "Not an employment certainty score. UNKNOWN dims excluded from average.",
            }

    cand = db.query(Candidate).filter(Candidate.id == candidate_id).one()
    compass = (
        db.query(CandidateCareerCompass)
        .filter(CandidateCareerCompass.candidate_id == candidate_id)
        .one_or_none()
    )
    goals = (
        db.query(CandidateCareerGoal)
        .filter(CandidateCareerGoal.candidate_id == candidate_id)
        .all()
    )
    actions = (
        db.query(CandidateCareerAction)
        .filter(CandidateCareerAction.candidate_id == candidate_id)
        .all()
    )
    mem_count = (
        db.query(CandidateCopilotMemory)
        .filter(
            CandidateCopilotMemory.candidate_id == candidate_id,
            CandidateCopilotMemory.archived_at.is_(None),
        )
        .count()
    )
    apps = db.query(Application).filter(Application.candidate_id == candidate_id).count()

    dims: dict[str, dict] = {}

    # Clarity
    clarity = 20
    clarity_why = []
    if compass and compass.target_role:
        clarity += 50
        clarity_why.append("Target role set")
    else:
        clarity_why.append("No target role")
    if compass and compass.target_seniority:
        clarity += 20
        clarity_why.append("Seniority set")
    dims["clarity"] = {
        "score": min(100, clarity),
        "explain": "; ".join(clarity_why),
        "claim": cc.CLAIM_FACT,
    }

    # Market readiness — no invented market
    market = 15
    market_why = ["Live market demand UNKNOWN — score uses profile completeness only"]
    skills = cc._skills_from_candidate(cand)
    if skills:
        market += min(40, len(skills) * 4)
        market_why.append(f"{len(skills)} skills on profile")
    if cand.cv_text:
        market += 25
        market_why.append("CV text present")
    dims["market_readiness"] = {
        "score": min(100, market),
        "explain": "; ".join(market_why),
        "claim": cc.CLAIM_INFERENCE,
        "unknowns": ["live_market_demand", "salary_band"],
    }

    # Interview readiness
    interview = 10
    interview_why = ["No interview practice signal"]
    if apps > 0:
        interview += 20
        interview_why = [f"{apps} application(s) in TWIN"]
    dims["interview_readiness"] = {
        "score": min(100, interview),
        "explain": "; ".join(interview_why),
        "claim": cc.CLAIM_UNKNOWN if apps == 0 else cc.CLAIM_INFERENCE,
    }

    # Portfolio
    portfolio = 20 if cand.cv_text else 5
    dims["portfolio"] = {
        "score": portfolio,
        "explain": "CV present" if cand.cv_text else "No CV — portfolio thin",
        "claim": cc.CLAIM_FACT,
    }

    # Technical depth
    tech = min(100, 10 + len(skills) * 8)
    dims["technical_depth"] = {
        "score": tech,
        "explain": f"Skill count {len(skills)} (not a certainty of depth)",
        "claim": cc.CLAIM_INFERENCE,
    }

    # Communication — UNKNOWN without evidence
    dims["communication"] = {
        "score": 0,
        "explain": "No communication evidence scored — UNKNOWN",
        "claim": cc.CLAIM_UNKNOWN,
    }

    # Goal consistency
    active = [g for g in goals if g.status == "active"]
    paused = [g for g in goals if g.status == "paused"]
    goal_score = 30 if active else 10
    if active and compass and compass.target_role:
        goal_score += 40
    if paused:
        goal_score -= 10
    dims["goal_consistency"] = {
        "score": max(0, min(100, goal_score)),
        "explain": f"Active goals={len(active)}, paused={len(paused)}",
        "claim": cc.CLAIM_FACT,
    }

    # Learning momentum
    done = sum(1 for a in actions if a.status == "completed")
    planned = sum(1 for a in actions if a.status == "planned")
    learn = min(100, 10 + done * 15 + min(20, planned * 2) + min(20, mem_count * 2))
    dims["learning_momentum"] = {
        "score": learn,
        "explain": f"Completed actions={done}, planned={planned}, memories={mem_count}",
        "claim": cc.CLAIM_INFERENCE,
    }

    scores = [d["score"] for d in dims.values() if d["claim"] != cc.CLAIM_UNKNOWN]
    overall = int(sum(scores) / max(len(scores), 1)) if scores else 0
    conf = "medium" if scores else "low"

    snap = CandidateCareerHealthSnapshot(
        candidate_id=candidate_id,
        overall_score=overall,
        dimensions_json=cc._dumps({k: v["score"] for k, v in dims.items()}),
        explanations_json=cc._dumps(dims),
        confidence=conf,
        created_at=_utcnow(),
    )
    db.add(snap)
    db.commit()
    db.refresh(snap)
    return {
        "schema": "twin.career_health/v1",
        "overall_score": overall,
        "dimensions": dims,
        "confidence": conf,
        "snapshot_id": snap.id,
        "ai_kill_switch": kill_switch_engaged(),
        "kpi_excluded": True,
        "cached": False,
        "note": "Not an employment certainty score. UNKNOWN dims excluded from average.",
    }


def create_scenario(
    db: Session,
    *,
    candidate_id: int,
    options: list[str],
    title: str | None = None,
) -> CandidateCareerScenario:
    """Unlimited scenario comparison — salary/market UNKNOWN."""
    opts = [o.strip()[:64] for o in options if o.strip()][:12] or [
        "stay",
        "job_a",
        "job_b",
        "abroad",
        "freelance",
        "management",
    ]
    prefs = infer_preferences(db, candidate_id=candidate_id)
    pref_map = {p.pref_key: cc._loads(p.value_json, {}) for p in prefs}
    comparison = {}
    for o in opts:
        comparison[o] = {
            "pros": [],
            "cons": [],
            "risks": ["UNKNOWN_market"],
            "opportunities": [],
            "timeline": "UNKNOWN",
            "uncertainty": "high",
            "confidence": "low",
            "salary_trend": "UNKNOWN",
            "claims": [
                cc._claim(cc.CLAIM_UNKNOWN, "Salary/market never fabricated", confidence="high"),
            ],
        }
        if o == "stay":
            comparison[o]["pros"] = ["Continuity", "Known context"]
            comparison[o]["cons"] = ["May slow target progress"]
            comparison[o]["risks"] = ["stagnation"]
            comparison[o]["confidence"] = "medium"
        elif o == "management":
            if pref_map.get("avoids_management", {}).get("value"):
                comparison[o]["cons"] = ["Conflicts with inferred preference avoids_management"]
                comparison[o]["claims"].append(
                    cc._claim(cc.CLAIM_INFERENCE, "User rejected EM direction earlier", ["prefs"])
                )
            comparison[o]["pros"] = ["Leadership leverage"]
            comparison[o]["risks"] = ["less_ic_craft"]
        elif o in {"freelance", "abroad"}:
            comparison[o]["pros"] = ["Autonomy / new market"]
            comparison[o]["cons"] = ["Transition cost"]
            comparison[o]["risks"] = ["income_or_relocation_uncertainty"]
        else:
            comparison[o]["pros"] = ["Optionality"]
            comparison[o]["cons"] = ["Switching cost"]

    ranking_explain = {
        "inputs": ["preferences", "career_graph", "goals"],
        "reasoning": "Structural comparison only; no invented employer intent",
        "unknowns": ["salary", "market_demand", "recruiter_intent"],
        "alternatives": opts,
        "confidence": "low",
    }
    key = "scenario_" + hashlib.sha256("|".join(sorted(opts)).encode()).hexdigest()[:12]
    now = _utcnow()
    row = CandidateCareerScenario(
        candidate_id=candidate_id,
        scenario_key=key,
        title=(title or "Scenario comparison")[:200],
        comparison_json=cc._dumps({"options": comparison}),
        confidence="low",
        claims_json=cc._dumps(
            [cc._claim(cc.CLAIM_UNKNOWN, "No fabricated salary or company strategy")]
        ),
        ranking_explain_json=cc._dumps(ranking_explain),
        created_at=now,
        updated_at=now,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    record_memory(
        db,
        candidate_id=candidate_id,
        memory_key=f"scenario:{key}",
        kind="scenario",
        title=row.title,
        body={"scenario_id": row.id, "options": opts},
        claim_kind=cc.CLAIM_SUGGESTION,
        edit_existing=True,
    )
    return row


def submit_learning_loop(
    db: Session,
    *,
    candidate_id: int,
    useful: bool | None,
    prediction_correct: bool | None,
    surprise: str | None,
    improve_reasoning: str | None,
    milestone_ref: str | None = None,
) -> CandidateLearningLoopEntry:
    surprise_s = cc.scrub_prompt_injection(surprise or "")[:2000]
    improve_s = cc.scrub_prompt_injection(improve_reasoning or "")[:2000]
    row = CandidateLearningLoopEntry(
        candidate_id=candidate_id,
        milestone_ref=(milestone_ref or None) and milestone_ref[:128],
        useful=useful,
        prediction_correct=prediction_correct,
        surprise=surprise_s or None,
        improve_reasoning=improve_s or None,
        payload_json=cc._dumps({"kpi_excluded": True}),
        created_at=_utcnow(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    record_memory(
        db,
        candidate_id=candidate_id,
        memory_key=f"learning_loop:{row.id}",
        kind="learning_loop",
        title="Learning loop feedback",
        body={
            "useful": useful,
            "prediction_correct": prediction_correct,
            "surprise": surprise_s[:200],
            "improve_reasoning": improve_s[:200],
        },
        claim_kind=cc.CLAIM_FACT,
        source="user",
    )
    add_timeline_event(
        db,
        candidate_id=candidate_id,
        event_type="learning_loop",
        title="Learning loop answered",
        payload={"entry_id": row.id},
    )
    return row


def sync_interaction_memories(db: Session, *, candidate_id: int) -> None:
    """WS10 — seed memories from existing Copilot state so generation never starts from zero."""
    for d in (
        db.query(CandidateCareerDirection)
        .filter(CandidateCareerDirection.candidate_id == candidate_id)
        .all()
    ):
        if d.status in {"accepted", "rejected"}:
            record_memory(
                db,
                candidate_id=candidate_id,
                memory_key=f"direction:{d.path_key}:{d.status}",
                kind="career_decision",
                title=f"Direction {d.status}: {d.title}",
                body={"path_key": d.path_key, "status": d.status},
                claim_kind=cc.CLAIM_FACT,
                source="direction_override",
            )
    for r in (
        db.query(CandidateCopilotRecommendation)
        .filter(CandidateCopilotRecommendation.candidate_id == candidate_id)
        .all()
    ):
        if r.status in {"accepted", "rejected", "ignored", "completed"}:
            record_memory(
                db,
                candidate_id=candidate_id,
                memory_key=f"rec:{r.rec_key}:{r.status}",
                kind=f"advice_{r.status}",
                title=f"Advice {r.status}: {r.title}",
                body={"rec_key": r.rec_key, "status": r.status},
                claim_kind=cc.CLAIM_FACT,
            )
    for a in (
        db.query(CandidateCareerAction)
        .filter(CandidateCareerAction.candidate_id == candidate_id)
        .all()
    ):
        if a.status in {"completed", "skipped"}:
            record_memory(
                db,
                candidate_id=candidate_id,
                memory_key=f"action:{a.id}:{a.status}",
                kind=f"action_{a.status}",
                title=f"Action {a.status}: {a.title}",
                body={"action_id": a.id, "horizon": a.horizon},
                claim_kind=cc.CLAIM_FACT,
            )
    for g in (
        db.query(CandidateCareerGoal)
        .filter(CandidateCareerGoal.candidate_id == candidate_id)
        .all()
    ):
        # Idempotent per goal+status — do not bump version on every refresh
        record_memory(
            db,
            candidate_id=candidate_id,
            memory_key=f"goal:{g.id}:{g.status}",
            kind="goal_change",
            title=f"Goal {g.status}: {g.title}",
            body={"goal_id": g.id, "progress": g.progress_percent},
            claim_kind=cc.CLAIM_FACT,
        )


def build_adaptive_aggregate(
    db: Session, *, candidate_id: int, force_health: bool = False
) -> dict[str, Any]:
    """Full adaptive layer + base Copilot aggregate (WS10 reuse)."""
    # Ensure base state exists
    base = cc.build_aggregate(db, candidate_id=candidate_id)
    sync_interaction_memories(db, candidate_id=candidate_id)
    infer_preferences(db, candidate_id=candidate_id)
    skills = refresh_skill_evolution(db, candidate_id=candidate_id)
    health = compute_health_score(db, candidate_id=candidate_id, force=force_health)
    ranked = rank_recommendations(db, candidate_id=candidate_id)
    memories = list_memories(db, candidate_id=candidate_id)
    timeline = list_timeline(db, candidate_id=candidate_id)
    prefs = (
        db.query(CandidateCopilotPreference)
        .filter(
            CandidateCopilotPreference.candidate_id == candidate_id,
            CandidateCopilotPreference.archived_at.is_(None),
        )
        .all()
    )
    loops = (
        db.query(CandidateLearningLoopEntry)
        .filter(CandidateLearningLoopEntry.candidate_id == candidate_id)
        .order_by(CandidateLearningLoopEntry.id.desc())
        .limit(20)
        .all()
    )
    scenarios = (
        db.query(CandidateCareerScenario)
        .filter(
            CandidateCareerScenario.candidate_id == candidate_id,
            CandidateCareerScenario.archived_at.is_(None),
        )
        .order_by(CandidateCareerScenario.id.desc())
        .limit(20)
        .all()
    )
    explainability_2 = {
        "schema": "twin.explainability_2/v1",
        "inputs": [
            "career_graph",
            "preferences",
            "memories",
            "timeline",
            "goals",
            "recommendation_memory",
            "health_score",
            "learning_loop",
        ],
        "reasoning": "Adaptive ranking reuses accumulated history; never starts from zero",
        "evidence": ["memory_engine", "preference_learning", "timeline"],
        "unknowns": ["live_market", "salary_bands", "recruiter_intent", "company_strategy"],
        "alternatives": "See directions + scenarios",
        "confidence": health.get("confidence"),
        "uncertainty": "Prefer UNKNOWN over invention",
        "claim_kinds": [cc.CLAIM_FACT, cc.CLAIM_INFERENCE, cc.CLAIM_SUGGESTION, cc.CLAIM_UNKNOWN],
    }
    base["adaptive"] = {
        "schema": "twin.adaptive_career_intelligence/v1",
        "verdict_target": (
            "ADAPTIVE CAREER COPILOT CUSTOMER-USABLE — LONG-TERM CAREER INTELLIGENCE PRODUCTION-READY"
        ),
        "memories": memories,
        "preferences": [
            {
                "id": p.id,
                "pref_key": p.pref_key,
                "value": cc._loads(p.value_json, {}),
                "confidence": p.confidence,
                "evidence": cc._loads(p.evidence_json, []),
                "claim_kind": p.claim_kind,
                "user_override": p.user_override,
                "editable": p.editable,
            }
            for p in prefs
        ],
        "ranked_recommendations": ranked,
        "timeline": timeline,
        "skill_evolution": skills,
        "health": health,
        "scenarios": [
            {
                "id": s.id,
                "scenario_key": s.scenario_key,
                "title": s.title,
                "comparison": cc._loads(s.comparison_json, {}),
                "ranking_explain": cc._loads(s.ranking_explain_json, {}),
                "confidence": s.confidence,
                "claims": cc._loads(s.claims_json, []),
            }
            for s in scenarios
        ],
        "learning_loop": [
            {
                "id": e.id,
                "useful": e.useful,
                "prediction_correct": e.prediction_correct,
                "surprise": e.surprise,
                "improve_reasoning": e.improve_reasoning,
                "milestone_ref": e.milestone_ref,
            }
            for e in loops
        ],
        "explainability_2": explainability_2,
        "evolution": {
            "reuses_memory": True,
            "reuses_graph": True,
            "reuses_preferences": True,
            "reuses_timeline": True,
            "reuses_health": True,
            "never_starts_from_zero": True,
        },
        "analytics": {
            "kpi_excluded": True,
            "memory_count": len(memories),
            "preference_count": len(prefs),
            "timeline_count": len(timeline),
            "scenario_count": len(scenarios),
            "learning_loop_count": len(loops),
        },
        "safety": {
            **(base.get("safety") or {}),
            "no_protected_attr_inference": True,
            "forbidden_pref_keys": list(FORBIDDEN_PREF_KEYS),
            "no_invented_salary_or_market": True,
        },
        "alembic": "108_adaptive_career_intelligence",
    }
    base["product"] = "adaptive_career_copilot"
    base["verdict_target"] = base["adaptive"]["verdict_target"]
    return base
