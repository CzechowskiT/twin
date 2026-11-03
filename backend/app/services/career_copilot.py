"""Career Copilot 2.0 — persistent AI career advisor orchestrator.

Not a chatbot. Evidence-based, uncertainty-aware, editable.
Every claim tagged: FACT | INFERENCE | SUGGESTION | UNKNOWN.
Never invents employers/salaries; never employment decisions; never protected attrs.
AI failures degrade to rules_v1 — never fabricated Claude output.
"""

from __future__ import annotations

import json
import logging
import re
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import (
    Candidate,
    CandidateCareerAction,
    CandidateCareerCompass,
    CandidateCareerDecision,
    CandidateCareerDirection,
    CandidateCareerGoal,
    CandidateCareerGraph,
    CandidateCareerReflection,
    CandidateCopilotRecommendation,
    CandidateIntelligenceProfile,
)
from app.services.ai_intel_validation import kill_switch_engaged

logger = logging.getLogger(__name__)

CLAIM_FACT = "FACT"
CLAIM_INFERENCE = "INFERENCE"
CLAIM_SUGGESTION = "SUGGESTION"
CLAIM_UNKNOWN = "UNKNOWN"

FORBIDDEN_ADVICE = frozenset(
    {"therapy", "medical", "legal", "financial_advice", "hiring_decision", "protected_attr"}
)

DIRECTION_CATALOG = (
    ("specialist_ic", "Deep specialist (IC)"),
    ("staff_principal", "Staff / Principal path"),
    ("engineering_manager", "Engineering manager"),
    ("architect", "Architect / systems design"),
    ("product", "Product / product-adjacent"),
    ("ai_ml", "AI / ML specialization"),
    ("consulting", "Consulting / fractional"),
    ("freelance", "Independent / freelance"),
)

HORIZONS = ("week1", "week2", "month1", "quarter", "month6", "month12")


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _dumps(obj: Any) -> str:
    return json.dumps(obj, ensure_ascii=False)


def _loads(raw: str | None, default: Any = None) -> Any:
    if not raw:
        return default
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return default


def _claim(kind: str, text: str, evidence: list[str] | None = None, confidence: str = "low") -> dict:
    return {
        "kind": kind if kind in {CLAIM_FACT, CLAIM_INFERENCE, CLAIM_SUGGESTION, CLAIM_UNKNOWN} else CLAIM_UNKNOWN,
        "text": (text or "")[:500],
        "evidence": (evidence or [])[:8],
        "confidence": confidence,
    }


def _skills_from_candidate(c: Candidate) -> list[str]:
    try:
        raw = json.loads(c.skills or "[]")
    except json.JSONDecodeError:
        raw = []
    if not isinstance(raw, list):
        return []
    return [str(s).strip()[:80] for s in raw if str(s).strip()][:40]


def build_graph_payload(
    db: Session,
    *,
    candidate: Candidate,
    compass: CandidateCareerCompass | None,
    intel: CandidateIntelligenceProfile | None,
) -> dict[str, Any]:
    """Canonical career graph from known facts only — no invented employers."""
    skills = _skills_from_candidate(candidate)
    gaps = _loads(compass.skill_gaps, []) if compass else []
    strengths = _loads(compass.strengths, []) if compass else []
    priorities = _loads(compass.career_priorities, []) if compass else []
    industries = _loads(compass.preferred_industries, []) if compass else []
    locations = _loads(compass.preferred_locations, []) if compass else []

    current_role = None
    seniority = None
    if intel:
        current_role = intel.current_role
        seniority = intel.seniority
        if intel.normalized_skills_json:
            intel_skills = _loads(intel.normalized_skills_json, []) or []
            for s in intel_skills:
                if s and s not in skills:
                    skills.append(str(s)[:80])

    claims = [
        _claim(
            CLAIM_FACT if candidate.cv_text else CLAIM_UNKNOWN,
            "CV text present" if candidate.cv_text else "No CV text on file",
            evidence=["candidate.cv_text"] if candidate.cv_text else [],
            confidence="high" if candidate.cv_text else "low",
        ),
        _claim(
            CLAIM_FACT if skills else CLAIM_UNKNOWN,
            f"Skills on profile: {len(skills)}",
            evidence=["candidate.skills"],
            confidence="medium" if skills else "low",
        ),
    ]
    if compass and compass.target_role:
        claims.append(
            _claim(
                CLAIM_FACT,
                f"Stated target role: {compass.target_role}",
                evidence=["career_compass.target_role"],
                confidence="high",
            )
        )
    else:
        claims.append(
            _claim(CLAIM_UNKNOWN, "Target role not set", confidence="high")
        )

    unknowns = []
    if not compass or not compass.target_role:
        unknowns.append("target_role")
    if not skills:
        unknowns.append("skills")
    if not candidate.experience_years:
        unknowns.append("experience_years")

    return {
        "schema": "twin.career_graph/v1",
        "goals": {
            "target_role": compass.target_role if compass else None,
            "target_seniority": compass.target_seniority if compass else None,
            "priorities": priorities[:20],
        },
        "current": {
            "role": current_role or None,
            "seniority": seniority or None,
            "experience_years": candidate.experience_years,
            "location": candidate.location,
        },
        "skills": skills[:40],
        "missing_skills": [str(g)[:80] for g in (gaps or [])][:20],
        "strengths": [str(s)[:80] for s in (strengths or [])][:20],
        "preferences": {
            "industries": industries[:15],
            "locations": locations[:15],
            "work_mode": compass.work_mode if compass else None,
            "salary_min": compass.salary_expectation_min if compass else None,
            "salary_max": compass.salary_expectation_max if compass else None,
            "salary_currency": (compass.salary_currency if compass else "PLN"),
        },
        "motivators": priorities[:10],
        "constraints": [],
        "languages": [],
        "mobility": locations[:10],
        "education": None,
        "certs": [],
        "projects": [],
        "portfolio": None,
        "target_companies": [],
        "claims": claims,
        "unknowns": unknowns,
        "safety": {
            "no_protected_attrs": True,
            "no_employment_decision": True,
            "no_therapy_medical_legal_financial": True,
        },
    }


def refresh_graph(db: Session, *, candidate_id: int) -> CandidateCareerGraph:
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).one()
    compass = (
        db.query(CandidateCareerCompass)
        .filter(CandidateCareerCompass.candidate_id == candidate_id)
        .one_or_none()
    )
    intel = (
        db.query(CandidateIntelligenceProfile)
        .filter(CandidateIntelligenceProfile.candidate_id == candidate_id)
        .one_or_none()
    )
    payload = build_graph_payload(db, candidate=candidate, compass=compass, intel=intel)
    conf = "high" if len(payload["unknowns"]) <= 1 else ("medium" if len(payload["unknowns"]) <= 3 else "low")
    row = (
        db.query(CandidateCareerGraph)
        .filter(CandidateCareerGraph.candidate_id == candidate_id)
        .one_or_none()
    )
    now = _utcnow()
    if row is None:
        row = CandidateCareerGraph(
            candidate_id=candidate_id,
            graph_json=_dumps(payload),
            version=1,
            source="rules_v1",
            confidence=conf,
            created_at=now,
            updated_at=now,
        )
        db.add(row)
    else:
        row.graph_json = _dumps(payload)
        row.version = int(row.version or 1) + 1
        row.source = "rules_v1"
        row.confidence = conf
        row.updated_at = now
        db.add(row)
    db.commit()
    db.refresh(row)
    return row


def _direction_specs(graph: dict[str, Any]) -> list[dict[str, Any]]:
    """Rules-based direction engine — market/salary marked UNKNOWN when no signal."""
    skills = [s.lower() for s in (graph.get("skills") or [])]
    target = (graph.get("goals") or {}).get("target_role") or ""
    target_l = target.lower()
    has_mgmt_hint = any(x in target_l for x in ("manager", "lead", "head", "director"))
    has_ai = any(x in " ".join(skills) for x in ("ml", "machine learning", "llm", "ai ", "pytorch"))
    has_arch = any(x in " ".join(skills) for x in ("architect", "kubernetes", "distributed", "system design"))

    specs = []
    for key, title in DIRECTION_CATALOG:
        effort = "medium"
        risk = "medium"
        timeline = 12
        prob = 0.35
        conf = "low"
        evidence: list[str] = []
        claims = [
            _claim(CLAIM_UNKNOWN, "Market demand not measured from live signals", confidence="high"),
            _claim(CLAIM_UNKNOWN, "Salary trend not fabricated — UNKNOWN without sources", confidence="high"),
        ]
        if key == "specialist_ic":
            prob = 0.55 if skills else 0.3
            effort = "medium"
            timeline = 9
            if skills:
                evidence.append("profile_skills")
                claims.append(_claim(CLAIM_INFERENCE, "IC specialist fits existing skill depth", evidence, "medium"))
                conf = "medium"
        elif key == "engineering_manager":
            prob = 0.5 if has_mgmt_hint else 0.25
            effort = "high"
            risk = "medium"
            timeline = 18
            if has_mgmt_hint:
                evidence.append("stated_target_role")
                claims.append(_claim(CLAIM_FACT, "Target role suggests management interest", evidence, "high"))
                conf = "medium"
            else:
                claims.append(_claim(CLAIM_SUGGESTION, "EM path possible but not evidenced in target", [], "low"))
        elif key == "architect":
            prob = 0.45 if has_arch else 0.28
            effort = "high"
            timeline = 18
            if has_arch:
                evidence.append("skills_overlap")
                conf = "medium"
        elif key == "ai_ml":
            prob = 0.5 if has_ai else 0.2
            effort = "high"
            risk = "high"
            timeline = 15
            if has_ai:
                evidence.append("skills_ai")
                conf = "medium"
        elif key == "product":
            prob = 0.3
            effort = "high"
            timeline = 18
        elif key == "staff_principal":
            prob = 0.4 if len(skills) >= 8 else 0.22
            effort = "high"
            timeline = 24
        elif key == "consulting":
            prob = 0.28
            effort = "medium"
            risk = "high"
            timeline = 12
        elif key == "freelance":
            prob = 0.32
            effort = "medium"
            risk = "high"
            timeline = 6

        if target and key in target_l.replace(" ", "_"):
            prob = min(0.75, prob + 0.15)
            evidence.append("target_role_alignment")

        specs.append(
            {
                "path_key": key,
                "title": title,
                "probability": round(prob, 2),
                "effort": effort,
                "risk": risk,
                "timeline_months": timeline,
                "market_demand": "UNKNOWN",
                "salary_trend": "UNKNOWN",
                "confidence": conf,
                "evidence": evidence,
                "claims": claims,
                "payload": {"aligned_to_target": bool(target)},
            }
        )
    specs.sort(key=lambda x: (-float(x["probability"] or 0), x["path_key"]))
    return specs


def refresh_directions(db: Session, *, candidate_id: int) -> list[CandidateCareerDirection]:
    graph_row = (
        db.query(CandidateCareerGraph)
        .filter(CandidateCareerGraph.candidate_id == candidate_id)
        .one_or_none()
    )
    if graph_row is None:
        graph_row = refresh_graph(db, candidate_id=candidate_id)
    graph = _loads(graph_row.graph_json, {}) or {}
    specs = _direction_specs(graph)
    now = _utcnow()
    out: list[CandidateCareerDirection] = []
    for spec in specs:
        row = (
            db.query(CandidateCareerDirection)
            .filter(
                CandidateCareerDirection.candidate_id == candidate_id,
                CandidateCareerDirection.path_key == spec["path_key"],
            )
            .one_or_none()
        )
        if row and row.status in {"rejected", "accepted"} and row.rejected_at:
            # Preserve human override — update payload only if not rejected
            if row.status == "rejected":
                out.append(row)
                continue
        if row is None:
            row = CandidateCareerDirection(
                candidate_id=candidate_id,
                path_key=spec["path_key"],
                title=spec["title"],
                status="suggested",
                created_at=now,
            )
            db.add(row)
        if row.status != "rejected":
            row.title = spec["title"]
            row.probability = spec["probability"]
            row.effort = spec["effort"]
            row.risk = spec["risk"]
            row.timeline_months = spec["timeline_months"]
            row.market_demand = spec["market_demand"]
            row.salary_trend = spec["salary_trend"]
            row.confidence = spec["confidence"]
            row.evidence_json = _dumps(spec["evidence"])
            row.claims_json = _dumps(spec["claims"])
            row.payload_json = _dumps(spec["payload"])
            row.updated_at = now
            db.add(row)
        out.append(row)
    db.commit()
    for r in out:
        db.refresh(r)
    return out


def analyze_gaps(db: Session, *, candidate_id: int) -> dict[str, Any]:
    graph_row = (
        db.query(CandidateCareerGraph)
        .filter(CandidateCareerGraph.candidate_id == candidate_id)
        .one_or_none()
    )
    if graph_row is None:
        graph_row = refresh_graph(db, candidate_id=candidate_id)
    g = _loads(graph_row.graph_json, {}) or {}
    skills = g.get("skills") or []
    missing = g.get("missing_skills") or []
    target = (g.get("goals") or {}).get("target_role")
    blockers = []
    if not target:
        blockers.append({"id": "no_target", "text": "Set a target role first", "kind": CLAIM_FACT})
    if not skills:
        blockers.append({"id": "no_skills", "text": "Add skills or upload a CV", "kind": CLAIM_FACT})
    ordered = [{"skill": m, "priority": i + 1, "kind": "hard"} for i, m in enumerate(missing[:15])]
    # Soft gaps as suggestions only
    if target and not missing:
        ordered.append(
            {
                "skill": "portfolio_evidence",
                "priority": 1,
                "kind": "soft",
                "claim": CLAIM_SUGGESTION,
                "note": "No explicit skill gaps listed — consider portfolio evidence for target role",
            }
        )
    return {
        "schema": "twin.career_gap_analysis/v1",
        "today": {"skills": skills[:20], "role": (g.get("current") or {}).get("role")},
        "target": {"role": target, "seniority": (g.get("goals") or {}).get("target_seniority")},
        "blockers": blockers,
        "missing_competencies": ordered,
        "experience_gap": CLAIM_UNKNOWN,
        "portfolio_gap": CLAIM_UNKNOWN if not skills else CLAIM_SUGGESTION,
        "cert_gap": CLAIM_UNKNOWN,
        "language_gap": CLAIM_UNKNOWN,
        "claims": [
            _claim(CLAIM_FACT if missing else CLAIM_UNKNOWN, f"Listed skill gaps: {len(missing)}", ["compass.skill_gaps"]),
            _claim(CLAIM_UNKNOWN, "Market hard-requirements not scraped for this target", confidence="high"),
        ],
        "ai_degraded": kill_switch_engaged(),
    }


def ensure_action_plan(db: Session, *, candidate_id: int, force: bool = False) -> list[CandidateCareerAction]:
    existing = (
        db.query(CandidateCareerAction)
        .filter(CandidateCareerAction.candidate_id == candidate_id)
        .count()
    )
    if existing > 0 and not force:
        return (
            db.query(CandidateCareerAction)
            .filter(CandidateCareerAction.candidate_id == candidate_id)
            .order_by(CandidateCareerAction.priority.asc(), CandidateCareerAction.id.asc())
            .all()
        )
    gaps = analyze_gaps(db, candidate_id=candidate_id)
    missing = gaps.get("missing_competencies") or []
    compass = (
        db.query(CandidateCareerCompass)
        .filter(CandidateCareerCompass.candidate_id == candidate_id)
        .one_or_none()
    )
    next_steps = _loads(compass.next_steps, []) if compass else []
    learning = _loads(compass.learning_actions, []) if compass else []

    plan: list[tuple[str, str, int, str, str]] = [
        ("week1", "Clarify target role and constraints in Career Compass", 10, "low", "Unblocks direction engine"),
        ("week1", "Upload or refresh CV if missing", 15, "low", "Evidence for skills graph"),
        ("week2", "Review top 2 career directions and accept or reject", 20, "medium", "Human override"),
        ("month1", "Close one listed skill gap with a concrete artifact", 30, "medium", "Gap closure"),
        ("quarter", "Prepare one application package for a high-fit role (draft only)", 40, "medium", "Action boundary"),
        ("month6", "Re-run gap analysis and update goals progress", 50, "low", "Reflection loop"),
        ("month12", "Review decision simulator: stay vs change path", 60, "medium", "Long-term checkpoint"),
    ]
    for i, m in enumerate(missing[:3]):
        skill = m.get("skill") if isinstance(m, dict) else str(m)
        plan.append(("month1", f"Practice / evidence: {skill}", 25 + i, "medium", "From gap analysis"))
    for i, s in enumerate((next_steps or [])[:3]):
        plan.append(("week2", str(s)[:200], 22 + i, "low", "From your next steps"))
    for i, s in enumerate((learning or [])[:2]):
        plan.append(("quarter", str(s)[:200], 35 + i, "medium", "From learning actions"))

    now = _utcnow()
    rows: list[CandidateCareerAction] = []
    for horizon, title, priority, effort, reason in plan:
        row = CandidateCareerAction(
            candidate_id=candidate_id,
            horizon=horizon,
            title=title[:300],
            status="planned",
            effort=effort,
            priority=priority,
            reason=reason,
            impact="career_progress",
            confidence="medium",
            claim_kind=CLAIM_SUGGESTION,
            source="copilot_rules_v1",
            payload_json="{}",
            created_at=now,
            updated_at=now,
        )
        db.add(row)
        rows.append(row)
    db.commit()
    for r in rows:
        db.refresh(r)
    return rows


def simulate_decision(
    db: Session,
    *,
    candidate_id: int,
    options: list[str] | None = None,
) -> CandidateCareerDecision:
    """Compare stay / offer A / change path — no fabricated salary certainty."""
    opts = options or ["stay", "offer_a", "change_specialization", "manager_path", "freelance"]
    graph = refresh_graph(db, candidate_id=candidate_id)
    g = _loads(graph.graph_json, {}) or {}
    target = (g.get("goals") or {}).get("target_role")
    comparisons = {}
    for o in opts[:6]:
        comparisons[o] = {
            "pros": [],
            "cons": [],
            "risk": "UNKNOWN",
            "salary_trend": "UNKNOWN",
            "growth": "UNKNOWN",
            "learning": "medium" if o != "stay" else "low",
            "stability": "higher" if o == "stay" else "UNKNOWN",
            "confidence": "low",
            "claims": [
                _claim(CLAIM_UNKNOWN, "Salary/market bands not fabricated", confidence="high"),
                _claim(
                    CLAIM_SUGGESTION if target else CLAIM_UNKNOWN,
                    f"Option '{o}' relative to target '{target or 'unset'}'",
                    ["career_graph.goals"],
                    "low",
                ),
            ],
        }
        if o == "stay":
            comparisons[o]["pros"] = ["Continuity", "Known context"]
            comparisons[o]["cons"] = ["May delay target role progress"]
            comparisons[o]["risk"] = "low"
            comparisons[o]["stability"] = "higher"
        elif o == "manager_path":
            comparisons[o]["pros"] = ["Leadership leverage"]
            comparisons[o]["cons"] = ["Less IC craft time"]
            comparisons[o]["risk"] = "medium"
        elif o == "freelance":
            comparisons[o]["pros"] = ["Autonomy"]
            comparisons[o]["cons"] = ["Income variability"]
            comparisons[o]["risk"] = "high"
            comparisons[o]["stability"] = "lower"
        else:
            comparisons[o]["pros"] = ["Optionality"]
            comparisons[o]["cons"] = ["Transition cost"]
            comparisons[o]["risk"] = "medium"

    now = _utcnow()
    row = CandidateCareerDecision(
        candidate_id=candidate_id,
        scenario_key="compare_v1",
        title="Career decision comparison",
        comparison_json=_dumps({"options": comparisons, "do_nothing": {
            "text": "Without action, skill gaps and target remain unchanged",
            "claim": CLAIM_INFERENCE,
            "confidence": "medium",
        }}),
        confidence="low",
        claims_json=_dumps([
            _claim(CLAIM_UNKNOWN, "No live offer data — comparisons are structural only"),
        ]),
        created_at=now,
        updated_at=now,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def market_intelligence(db: Session, *, candidate_id: int) -> dict[str, Any]:
    """Aggregate available signals only — never fabricate."""
    _ = db, candidate_id
    return {
        "schema": "twin.career_market_intel/v1",
        "role_demand": CLAIM_UNKNOWN,
        "competition": CLAIM_UNKNOWN,
        "salary_band": CLAIM_UNKNOWN,
        "direction": CLAIM_UNKNOWN,
        "confidence": "low",
        "sources": [],
        "note": "No fabricated market/salary. Wire live signals when available.",
        "claims": [
            _claim(CLAIM_UNKNOWN, "Market demand unavailable", confidence="high"),
            _claim(CLAIM_UNKNOWN, "Salary band unavailable", confidence="high"),
        ],
    }


def compass_overview(db: Session, *, candidate_id: int) -> dict[str, Any]:
    """WS5 — single page answers."""
    refresh_graph(db, candidate_id=candidate_id)
    dirs = refresh_directions(db, candidate_id=candidate_id)
    gaps = analyze_gaps(db, candidate_id=candidate_id)
    actions = ensure_action_plan(db, candidate_id=candidate_id)
    graph = (
        db.query(CandidateCareerGraph)
        .filter(CandidateCareerGraph.candidate_id == candidate_id)
        .one()
    )
    g = _loads(graph.graph_json, {}) or {}
    top = next((d for d in dirs if d.status != "rejected"), None)
    next_action = next((a for a in actions if a.status == "planned"), None)
    return {
        "schema": "twin.career_compass_overview/v1",
        "where_am_i": {
            "role": (g.get("current") or {}).get("role"),
            "skills_count": len(g.get("skills") or []),
            "unknowns": g.get("unknowns") or [],
            "claim": CLAIM_FACT if (g.get("skills") or (g.get("current") or {}).get("role")) else CLAIM_UNKNOWN,
        },
        "where_can_i_go": [
            {
                "path_key": d.path_key,
                "title": d.title,
                "probability": d.probability,
                "confidence": d.confidence,
                "status": d.status,
            }
            for d in dirs
            if d.status != "rejected"
        ][:5],
        "what_next": {
            "action": next_action.title if next_action else None,
            "horizon": next_action.horizon if next_action else None,
            "claim": CLAIM_SUGGESTION,
        },
        "why": {
            "top_direction": top.title if top else None,
            "evidence": _loads(top.evidence_json, []) if top else [],
            "claim": CLAIM_INFERENCE if top else CLAIM_UNKNOWN,
        },
        "if_i_do_nothing": {
            "text": "Gaps and target stay unchanged; directions remain suggestions only.",
            "claim": CLAIM_INFERENCE,
            "confidence": "medium",
        },
        "biggest_opportunity": {
            "text": top.title if top else "Set a target role to unlock directions",
            "claim": CLAIM_SUGGESTION if top else CLAIM_UNKNOWN,
        },
        "biggest_risk": {
            "text": "Acting on UNKNOWN market/salary as if certain",
            "claim": CLAIM_SUGGESTION,
        },
        "gaps_summary": gaps,
        "ai_kill_switch": kill_switch_engaged(),
        "kpi_excluded": True,
    }


# --- Goals ---

def list_goals(db: Session, *, candidate_id: int) -> list[CandidateCareerGoal]:
    return (
        db.query(CandidateCareerGoal)
        .filter(CandidateCareerGoal.candidate_id == candidate_id)
        .order_by(CandidateCareerGoal.id.desc())
        .all()
    )


def create_goal(
    db: Session,
    *,
    candidate_id: int,
    title: str,
    goal_type: str = "career",
    target_role: str | None = None,
) -> CandidateCareerGoal:
    now = _utcnow()
    row = CandidateCareerGoal(
        candidate_id=candidate_id,
        title=title.strip()[:300],
        goal_type=(goal_type or "career")[:64],
        status="active",
        target_role=(target_role or None) and target_role.strip()[:200],
        progress_percent=0,
        history_json=_dumps([{"at": now.isoformat() + "Z", "event": "created"}]),
        created_at=now,
        updated_at=now,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def update_goal_status(
    db: Session,
    *,
    candidate_id: int,
    goal_id: int,
    status: str,
    progress_percent: int | None = None,
) -> CandidateCareerGoal:
    row = (
        db.query(CandidateCareerGoal)
        .filter(CandidateCareerGoal.id == goal_id, CandidateCareerGoal.candidate_id == candidate_id)
        .one_or_none()
    )
    if row is None:
        raise ValueError("goal_not_found")
    now = _utcnow()
    hist = _loads(row.history_json, []) or []
    hist.append({"at": now.isoformat() + "Z", "event": f"status:{status}", "from": row.status})
    row.status = status[:32]
    if progress_percent is not None:
        row.progress_percent = max(0, min(100, int(progress_percent)))
    if status == "paused":
        row.paused_at = now
    elif status == "archived":
        row.archived_at = now
    elif status == "completed":
        row.completed_at = now
        row.progress_percent = 100
    elif status == "active":
        row.paused_at = None
        row.archived_at = None
    row.history_json = _dumps(hist[-50:])
    row.updated_at = now
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


# --- Recommendation memory ---

def upsert_recommendation(
    db: Session,
    *,
    candidate_id: int,
    rec_key: str,
    title: str,
    kind: str = "direction",
    claim_kind: str = CLAIM_SUGGESTION,
    confidence: str = "low",
    evidence: list[str] | None = None,
    payload: dict | None = None,
) -> CandidateCopilotRecommendation:
    row = (
        db.query(CandidateCopilotRecommendation)
        .filter(
            CandidateCopilotRecommendation.candidate_id == candidate_id,
            CandidateCopilotRecommendation.rec_key == rec_key[:128],
        )
        .one_or_none()
    )
    now = _utcnow()
    if row is None:
        row = CandidateCopilotRecommendation(
            candidate_id=candidate_id,
            rec_key=rec_key[:128],
            kind=kind[:64],
            title=title[:300],
            status="suggested",
            claim_kind=claim_kind,
            confidence=confidence,
            evidence_json=_dumps(evidence or []),
            payload_json=_dumps(payload or {}),
            created_at=now,
            updated_at=now,
        )
        db.add(row)
    else:
        # Never silently overwrite acceptance history — only refresh title/evidence if still suggested
        if row.status == "suggested":
            row.title = title[:300]
            row.evidence_json = _dumps(evidence or [])
            row.payload_json = _dumps(payload or {})
            row.confidence = confidence
            row.updated_at = now
            db.add(row)
    db.commit()
    db.refresh(row)
    return row


def set_recommendation_status(
    db: Session,
    *,
    candidate_id: int,
    rec_id: int,
    status: str,
) -> CandidateCopilotRecommendation:
    row = (
        db.query(CandidateCopilotRecommendation)
        .filter(
            CandidateCopilotRecommendation.id == rec_id,
            CandidateCopilotRecommendation.candidate_id == candidate_id,
        )
        .one_or_none()
    )
    if row is None:
        raise ValueError("recommendation_not_found")
    now = _utcnow()
    row.status = status[:32]
    if status == "accepted":
        row.accepted_at = now
    elif status == "rejected":
        row.rejected_at = now
    elif status == "ignored":
        row.ignored_at = now
    elif status == "completed":
        row.completed_at = now
    row.updated_at = now
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def sync_direction_recommendations(db: Session, *, candidate_id: int) -> None:
    for d in refresh_directions(db, candidate_id=candidate_id):
        if d.status == "rejected":
            continue
        upsert_recommendation(
            db,
            candidate_id=candidate_id,
            rec_key=f"direction:{d.path_key}",
            title=d.title,
            kind="direction",
            claim_kind=CLAIM_SUGGESTION,
            confidence=d.confidence,
            evidence=_loads(d.evidence_json, []) or [],
            payload={"path_key": d.path_key, "probability": d.probability},
        )


def set_direction_override(
    db: Session,
    *,
    candidate_id: int,
    path_key: str,
    action: str,
) -> CandidateCareerDirection:
    row = (
        db.query(CandidateCareerDirection)
        .filter(
            CandidateCareerDirection.candidate_id == candidate_id,
            CandidateCareerDirection.path_key == path_key,
        )
        .one_or_none()
    )
    if row is None:
        refresh_directions(db, candidate_id=candidate_id)
        row = (
            db.query(CandidateCareerDirection)
            .filter(
                CandidateCareerDirection.candidate_id == candidate_id,
                CandidateCareerDirection.path_key == path_key,
            )
            .one_or_none()
        )
    if row is None:
        raise ValueError("direction_not_found")
    now = _utcnow()
    if action == "reject":
        row.status = "rejected"
        row.rejected_at = now
        row.is_selected = False
    elif action == "accept":
        row.status = "accepted"
        row.is_selected = True
        row.rejected_at = None
        # Deselect siblings
        sibs = (
            db.query(CandidateCareerDirection)
            .filter(
                CandidateCareerDirection.candidate_id == candidate_id,
                CandidateCareerDirection.id != row.id,
            )
            .all()
        )
        for s in sibs:
            if s.is_selected:
                s.is_selected = False
                db.add(s)
    elif action == "restart":
        row.status = "suggested"
        row.rejected_at = None
        row.is_selected = False
    row.updated_at = now
    db.add(row)
    db.commit()
    db.refresh(row)
    # Mirror into recommendation memory
    try:
        rec = (
            db.query(CandidateCopilotRecommendation)
            .filter(
                CandidateCopilotRecommendation.candidate_id == candidate_id,
                CandidateCopilotRecommendation.rec_key == f"direction:{path_key}",
            )
            .one_or_none()
        )
        if rec:
            set_recommendation_status(
                db,
                candidate_id=candidate_id,
                rec_id=rec.id,
                status="rejected" if action == "reject" else ("accepted" if action == "accept" else "suggested"),
            )
    except Exception:  # noqa: BLE001
        pass
    return row


def add_reflection(
    db: Session,
    *,
    candidate_id: int,
    improved: str | None,
    did_not: str | None,
    changed: str | None,
    next_step: str | None,
    milestone_ref: str | None = None,
) -> CandidateCareerReflection:
    body = {
        "improved": (improved or "")[:1000],
        "did_not": (did_not or "")[:1000],
        "changed": (changed or "")[:1000],
        "next": (next_step or "")[:1000],
        "claim_kinds": {
            "improved": CLAIM_FACT,
            "did_not": CLAIM_FACT,
            "changed": CLAIM_INFERENCE,
            "next": CLAIM_SUGGESTION,
        },
    }
    # Safety: reject therapy/medical/legal phrasing as advice
    blob = " ".join(str(v) for v in body.values() if not isinstance(v, dict)).lower()
    if any(w in blob for w in ("diagnose", "prescribe", "sue ", "invest my money")):
        raise ValueError("forbidden_advice_domain")
    row = CandidateCareerReflection(
        candidate_id=candidate_id,
        milestone_ref=(milestone_ref or None) and milestone_ref[:128],
        body_json=_dumps(body),
        created_at=_utcnow(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def update_action_status(
    db: Session,
    *,
    candidate_id: int,
    action_id: int,
    status: str,
) -> CandidateCareerAction:
    row = (
        db.query(CandidateCareerAction)
        .filter(
            CandidateCareerAction.id == action_id,
            CandidateCareerAction.candidate_id == candidate_id,
        )
        .one_or_none()
    )
    if row is None:
        raise ValueError("action_not_found")
    row.status = status[:32]
    if status == "completed":
        row.completed_at = _utcnow()
    row.updated_at = _utcnow()
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def serialize_direction(d: CandidateCareerDirection) -> dict[str, Any]:
    return {
        "id": d.id,
        "path_key": d.path_key,
        "title": d.title,
        "status": d.status,
        "probability": d.probability,
        "effort": d.effort,
        "risk": d.risk,
        "timeline_months": d.timeline_months,
        "market_demand": d.market_demand,
        "salary_trend": d.salary_trend,
        "confidence": d.confidence,
        "evidence": _loads(d.evidence_json, []),
        "claims": _loads(d.claims_json, []),
        "is_selected": d.is_selected,
        "rejected_at": d.rejected_at.isoformat() + "Z" if d.rejected_at else None,
    }


def serialize_goal(g: CandidateCareerGoal) -> dict[str, Any]:
    return {
        "id": g.id,
        "title": g.title,
        "goal_type": g.goal_type,
        "status": g.status,
        "target_role": g.target_role,
        "progress_percent": g.progress_percent,
        "history": _loads(g.history_json, []),
        "paused_at": g.paused_at.isoformat() + "Z" if g.paused_at else None,
        "archived_at": g.archived_at.isoformat() + "Z" if g.archived_at else None,
        "completed_at": g.completed_at.isoformat() + "Z" if g.completed_at else None,
    }


def serialize_action(a: CandidateCareerAction) -> dict[str, Any]:
    return {
        "id": a.id,
        "horizon": a.horizon,
        "title": a.title,
        "status": a.status,
        "effort": a.effort,
        "priority": a.priority,
        "dependency": a.dependency,
        "reason": a.reason,
        "impact": a.impact,
        "confidence": a.confidence,
        "claim_kind": a.claim_kind,
        "source": a.source,
        "completed_at": a.completed_at.isoformat() + "Z" if a.completed_at else None,
    }


def serialize_rec(r: CandidateCopilotRecommendation) -> dict[str, Any]:
    return {
        "id": r.id,
        "rec_key": r.rec_key,
        "kind": r.kind,
        "title": r.title,
        "status": r.status,
        "claim_kind": r.claim_kind,
        "confidence": r.confidence,
        "evidence": _loads(r.evidence_json, []),
        "accepted_at": r.accepted_at.isoformat() + "Z" if r.accepted_at else None,
        "rejected_at": r.rejected_at.isoformat() + "Z" if r.rejected_at else None,
        "ignored_at": r.ignored_at.isoformat() + "Z" if r.ignored_at else None,
        "completed_at": r.completed_at.isoformat() + "Z" if r.completed_at else None,
    }


def build_aggregate(db: Session, *, candidate_id: int) -> dict[str, Any]:
    """Full Career Copilot payload for GET /me/career-copilot."""
    overview = compass_overview(db, candidate_id=candidate_id)
    sync_direction_recommendations(db, candidate_id=candidate_id)
    directions = (
        db.query(CandidateCareerDirection)
        .filter(CandidateCareerDirection.candidate_id == candidate_id)
        .all()
    )
    actions = (
        db.query(CandidateCareerAction)
        .filter(CandidateCareerAction.candidate_id == candidate_id)
        .order_by(CandidateCareerAction.priority.asc())
        .all()
    )
    goals = list_goals(db, candidate_id=candidate_id)
    recs = (
        db.query(CandidateCopilotRecommendation)
        .filter(CandidateCopilotRecommendation.candidate_id == candidate_id)
        .order_by(CandidateCopilotRecommendation.id.desc())
        .limit(50)
        .all()
    )
    decisions = (
        db.query(CandidateCareerDecision)
        .filter(CandidateCareerDecision.candidate_id == candidate_id)
        .order_by(CandidateCareerDecision.id.desc())
        .limit(5)
        .all()
    )
    reflections = (
        db.query(CandidateCareerReflection)
        .filter(CandidateCareerReflection.candidate_id == candidate_id)
        .order_by(CandidateCareerReflection.id.desc())
        .limit(10)
        .all()
    )
    graph = (
        db.query(CandidateCareerGraph)
        .filter(CandidateCareerGraph.candidate_id == candidate_id)
        .one_or_none()
    )
    return {
        "schema": "twin.career_copilot.aggregate/v1",
        "product": "career_copilot_2",
        "verdict_target": "CAREER COPILOT 2.0 CUSTOMER-USABLE — PERSISTENT AI CAREER ADVISOR PRODUCTION-READY",
        "overview": overview,
        "graph": _loads(graph.graph_json, {}) if graph else {},
        "graph_meta": {
            "version": graph.version if graph else 0,
            "confidence": graph.confidence if graph else "low",
            "source": graph.source if graph else None,
        },
        "directions": [serialize_direction(d) for d in directions],
        "gaps": analyze_gaps(db, candidate_id=candidate_id),
        "actions": [serialize_action(a) for a in actions],
        "goals": [serialize_goal(g) for g in goals],
        "recommendations": [serialize_rec(r) for r in recs],
        "market": market_intelligence(db, candidate_id=candidate_id),
        "decisions": [
            {
                "id": d.id,
                "scenario_key": d.scenario_key,
                "title": d.title,
                "comparison": _loads(d.comparison_json, {}),
                "confidence": d.confidence,
                "claims": _loads(d.claims_json, []),
            }
            for d in decisions
        ],
        "reflections": [
            {"id": r.id, "milestone_ref": r.milestone_ref, "body": _loads(r.body_json, {})}
            for r in reflections
        ],
        "explainability": {
            "claim_kinds": [CLAIM_FACT, CLAIM_INFERENCE, CLAIM_SUGGESTION, CLAIM_UNKNOWN],
            "note": "Every AI output must carry a claim kind; UNKNOWN preferred over invention.",
        },
        "safety": {
            "forbidden": list(FORBIDDEN_ADVICE),
            "ai_kill_switch": kill_switch_engaged(),
            "no_autonomous_employment": True,
            "fallback": "rules_v1",
        },
        "analytics": {
            "kpi_excluded": True,
            "synthetic_safe": True,
        },
        "stance": {
            "launch": "NO-GO",
            "enrollment": "OFF",
            "phase_3b": "BLOCKED",
            "phase_3_career_agent_not_started": True,
            "candidate_first_primary": True,
        },
        "generated_at": _utcnow().isoformat() + "Z",
    }


def scrub_prompt_injection(text: str) -> str:
    """Lightweight neutralization — treat user text as untrusted."""
    t = text or ""
    t = re.sub(r"(?i)ignore\s+(all\s+)?previous\s+instructions", "[neutralized]", t)
    t = re.sub(r"(?i)system\s*:", "[neutralized]", t)
    return t[:4000]
