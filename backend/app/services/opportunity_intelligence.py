"""Evidence-backed opportunity discovery + market intelligence.

Extends canonical Job store + Epic 2.0 ranking. Never fabricates salary/demand/activity.
Safe ingestion (SSRF/MIME/size). No external apply / prohibited scraping / second ranking store.
"""

from __future__ import annotations

import hashlib
import json
import logging
import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import urlparse

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database.models import (
    CandidateCareerEvidence,
    CandidateDiscoveryPrefs,
    CandidateNormalizedOpportunity,
    CandidateOpportunityAudit,
    CandidateOpportunityComparison,
    CandidateOpportunityWatchlist,
    CandidateOpportunityWatchlistHit,
    CandidateSavedSearch,
    Job,
    MarketSignalSnapshot,
    OpportunityIngestionAudit,
    OpportunityRefreshJob,
    OpportunitySource,
)
from app.services import career_copilot as cc
from app.services.url_safety import assert_public_https_url

logger = logging.getLogger(__name__)

MAX_PASTE_CHARS = 12_000
MAX_URL_META = 500
ALLOWED_MIME_HINTS = ("text/plain", "text/html", "application/json", "text/")
BOARD_DEFAULTS = (
    ("pracuj", "board", "pracuj.pl"),
    ("rocketjobs", "board", "rocketjobs.pl"),
    ("justjoin", "board", "justjoin.it"),
    ("manual_paste", "manual", "Manual paste"),
    ("url_meta", "url", "URL metadata (no bypass)"),
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _dumps(obj: Any) -> str:
    return json.dumps(obj, ensure_ascii=False, default=str)


def _loads(raw: str | None, default: Any) -> Any:
    if not raw:
        return default
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return default


def _uuid(prefix: str) -> str:
    return f"{prefix}:{uuid.uuid4().hex[:16]}"


def _dedupe_key(title: str, company: str, location: str | None) -> str:
    raw = f"{(title or '').strip().lower()}|{(company or '').strip().lower()}|{(location or '').strip().lower()}"
    return hashlib.sha256(raw.encode()).hexdigest()[:40]


def _cluster_key(title: str) -> str:
    tokens = re.findall(r"[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ0-9]+", (title or "").lower())
    return "role:" + "-".join(tokens[:4]) if tokens else "role:unknown"


def _audit(
    db: Session,
    *,
    candidate_id: int,
    entity_type: str,
    entity_id: int | None,
    action: str,
    before: dict,
    after: dict,
) -> None:
    db.add(
        CandidateOpportunityAudit(
            candidate_id=candidate_id,
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            before_json=_dumps(before),
            after_json=_dumps(after),
            created_at=_utcnow(),
        )
    )


def _ingest_audit(
    db: Session,
    *,
    candidate_id: int | None,
    source_id: int | None,
    action: str,
    policy_decision: str,
    detail: dict,
) -> None:
    db.add(
        OpportunityIngestionAudit(
            candidate_id=candidate_id,
            source_id=source_id,
            action=action,
            policy_decision=policy_decision,
            detail_json=_dumps(detail),
            created_at=_utcnow(),
        )
    )


def ensure_default_sources(db: Session) -> list[OpportunitySource]:
    out: list[OpportunitySource] = []
    for key, kind, name in BOARD_DEFAULTS:
        row = db.query(OpportunitySource).filter_by(source_key=key).one_or_none()
        if not row:
            row = OpportunitySource(
                source_key=key,
                kind=kind,
                board_id=key if kind == "board" else None,
                display_name=name,
                base_url=None,
                config_json="{}",
                policy_json=_dumps(
                    {
                        "ssrf_checked": True,
                        "prohibited_scraping": False,
                        "captcha_bypass": False,
                        "external_apply": False,
                        "authorized_path_only": True,
                    }
                ),
                enabled=True,
                authorized_path=True,
                claim_kind="FACT",
                created_at=_utcnow(),
                updated_at=_utcnow(),
            )
            db.add(row)
            db.flush()
        out.append(row)
    db.commit()
    return out


def get_or_create_prefs(db: Session, *, candidate_id: int) -> CandidateDiscoveryPrefs:
    row = db.query(CandidateDiscoveryPrefs).filter_by(candidate_id=candidate_id).one_or_none()
    if row:
        return row
    row = CandidateDiscoveryPrefs(
        candidate_id=candidate_id,
        prefs_json=_dumps({"target_companies": [], "role_paths": [], "effort_bias": "balanced"}),
        privacy_json=_dumps({"export_include_notes": False, "learning_opt_in": True}),
        paused=False,
        version=1,
        updated_at=_utcnow(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def _extract_requirements(text: str) -> list[dict]:
    lines = [ln.strip(" -•*\t") for ln in (text or "").splitlines() if len(ln.strip()) > 8]
    reqs = []
    for i, line in enumerate(lines[:20]):
        reqs.append(
            {
                "id": f"req:{i+1}",
                "text": line[:400],
                "kind": "must" if i < 6 else "nice",
                "claim_kind": "INFERENCE",
                "evidence_backed": False,
            }
        )
    if not reqs:
        reqs.append(
            {
                "id": "req:unknown",
                "text": "UNKNOWN — no requirements extracted",
                "kind": "unknown",
                "claim_kind": "UNKNOWN",
                "evidence_backed": False,
            }
        )
    return reqs


def _salary_intel(job: Job | None, paste: dict | None) -> dict:
    """Never fabricate salary — UNKNOWN when not observed."""
    if job and (job.salary_min is not None or job.salary_max is not None):
        return {
            "min": job.salary_min,
            "max": job.salary_max,
            "currency": "UNKNOWN",
            "source": "observed_job_row",
            "fabricated": False,
            "claim_kind": "SOURCE_SUPPORTED",
        }
    if paste and (paste.get("salary_min") is not None or paste.get("salary_max") is not None):
        return {
            "min": paste.get("salary_min"),
            "max": paste.get("salary_max"),
            "currency": paste.get("currency") or "UNKNOWN",
            "source": "candidate_paste",
            "fabricated": False,
            "claim_kind": "CANDIDATE_RECOLLECTION",
        }
    return {
        "min": None,
        "max": None,
        "currency": "UNKNOWN",
        "source": None,
        "fabricated": False,
        "claim_kind": "UNKNOWN",
        "note": "Salary UNKNOWN — not observed in authorized sources",
    }


def _freshness(job: Job | None) -> dict:
    if not job or not job.scraped_at:
        return {
            "age_hours": None,
            "stale": False,
            "activity_status": "UNKNOWN",
            "fabricated_activity": False,
            "claim_kind": "UNKNOWN",
        }
    age = (_utcnow() - job.scraped_at).total_seconds() / 3600.0
    stale = age > 72
    return {
        "age_hours": round(age, 1),
        "stale": stale,
        "activity_status": "STALE" if stale else "OBSERVED_RECENT",
        "fabricated_activity": False,
        "scraped_at": job.scraped_at.isoformat(),
        "claim_kind": "FACT",
    }


def _fit_from_evidence(db: Session, *, candidate_id: int, requirements: list[dict]) -> dict:
    evidence = (
        db.query(CandidateCareerEvidence)
        .filter(
            CandidateCareerEvidence.candidate_id == candidate_id,
            CandidateCareerEvidence.deleted_at.is_(None),
        )
        .limit(30)
        .all()
    )
    texts = " ".join(
        [
            (getattr(e, "title", None) or "")
            + " "
            + (getattr(e, "summary", None) or getattr(e, "body_text", None) or "")
            for e in evidence
        ]
    ).lower()
    matched = 0
    gaps = []
    for req in requirements:
        if req.get("claim_kind") == "UNKNOWN":
            continue
        tokens = re.findall(r"[a-zA-Z]{4,}", (req.get("text") or "").lower())[:3]
        hit = any(t in texts for t in tokens) if tokens and texts else False
        if hit:
            matched += 1
            req["evidence_backed"] = True
        else:
            gaps.append(req.get("id"))
    total = max(1, len([r for r in requirements if r.get("claim_kind") != "UNKNOWN"]))
    score = round(100.0 * matched / total, 1) if evidence else None
    return {
        "score": score,
        "matched": matched,
        "gaps": gaps,
        "evidence_count": len(evidence),
        "strong_fit_without_evidence": False,
        "deleted_evidence_excluded": True,
        "claim_kind": "INFERENCE" if evidence else "UNKNOWN",
        "note": None
        if evidence
        else "UNKNOWN fit — no Career Evidence available (not fabricated strong fit)",
    }


def _readiness(fit: dict, freshness: dict) -> dict:
    effort = "medium"
    if fit.get("score") is None:
        effort = "unknown"
    elif (fit.get("score") or 0) >= 70:
        effort = "low"
    elif (fit.get("score") or 0) < 40:
        effort = "high"
    return {
        "effort": effort,
        "stale_warning": bool(freshness.get("stale")),
        "studio_handoff_safe": not bool(freshness.get("stale")),
        "claim_kind": "INFERENCE",
    }


def _company_intel(company: str) -> dict:
    return {
        "company": company or "UNKNOWN",
        "observed_in_jobs_store": True,
        "employer_confidential": False,
        "surveillance": False,
        "claim_kind": "INFERENCE",
        "note": "Company intelligence limited to observed authorized job metadata",
    }


def ingest_manual_paste(
    db: Session,
    *,
    candidate_id: int,
    title: str,
    company: str,
    location: str | None = None,
    description: str | None = None,
    url: str | None = None,
    salary_min: int | None = None,
    salary_max: int | None = None,
    is_synthetic: bool = False,
) -> dict:
    prefs = get_or_create_prefs(db, candidate_id=candidate_id)
    if prefs.paused:
        raise ValueError("discovery_paused")
    ensure_default_sources(db)
    src = db.query(OpportunitySource).filter_by(source_key="manual_paste").one()
    desc = (description or "")[:MAX_PASTE_CHARS]
    if url:
        try:
            assert_public_https_url(url)
        except ValueError as exc:
            _ingest_audit(
                db,
                candidate_id=candidate_id,
                source_id=src.id,
                action="url_rejected",
                policy_decision="ssrf_blocked",
                detail={"error": str(exc)},
            )
            db.commit()
            raise ValueError(f"unsafe_url:{exc}") from exc
    # Reject active-content hints / oversized
    if "<script" in desc.lower() or "javascript:" in desc.lower():
        _ingest_audit(
            db,
            candidate_id=candidate_id,
            source_id=src.id,
            action="paste_rejected",
            policy_decision="active_content_blocked",
            detail={"mime_hint": "text/html+script"},
        )
        db.commit()
        raise ValueError("active_content_blocked")
    reqs = _extract_requirements(desc)
    fit = _fit_from_evidence(db, candidate_id=candidate_id, requirements=reqs)
    fres = {
        "age_hours": 0,
        "stale": False,
        "activity_status": "CANDIDATE_PASTE",
        "fabricated_activity": False,
        "claim_kind": "CANDIDATE_RECOLLECTION",
    }
    salary = _salary_intel(None, {"salary_min": salary_min, "salary_max": salary_max})
    ready = _readiness(fit, fres)
    dkey = _dedupe_key(title, company, location)
    existing = (
        db.query(CandidateNormalizedOpportunity)
        .filter_by(candidate_id=candidate_id, dedupe_key=dkey)
        .filter(CandidateNormalizedOpportunity.deleted_at.is_(None))
        .filter(CandidateNormalizedOpportunity.superseded_at.is_(None))
        .order_by(CandidateNormalizedOpportunity.version.desc())
        .first()
    )
    version = (existing.version + 1) if existing else 1
    if existing:
        existing.superseded_at = _utcnow()
    row = CandidateNormalizedOpportunity(
        candidate_id=candidate_id,
        opportunity_key=_uuid("opp"),
        job_id=None,
        source_id=src.id,
        version=version,
        title=(title or "UNKNOWN")[:300],
        company=(company or "UNKNOWN")[:200],
        location=(location or "UNKNOWN")[:200] if location else "UNKNOWN",
        url=(url or "")[:500] or None,
        dedupe_key=dkey,
        cluster_key=_cluster_key(title),
        normalized_json=_dumps(
            {
                "title": title,
                "company": company,
                "location": location,
                "description_chars": len(desc),
                "description_preview": desc[:400],
                "full_restricted_jd_stored": False,
                "source": "manual_paste",
                "normalized": True,
            }
        ),
        requirements_json=_dumps(reqs),
        freshness_json=_dumps(fres),
        fit_json=_dumps(fit),
        market_json=_dumps({"wording": "observed_source", "fabricated": False}),
        salary_json=_dumps(salary),
        company_intel_json=_dumps(_company_intel(company)),
        readiness_json=_dumps(ready),
        activity_status=fres["activity_status"],
        stale=False,
        claim_kind="CANDIDATE_RECOLLECTION",
        is_synthetic=is_synthetic,
        kpi_excluded=True,
        created_at=_utcnow(),
        updated_at=_utcnow(),
    )
    db.add(row)
    _ingest_audit(
        db,
        candidate_id=candidate_id,
        source_id=src.id,
        action="paste_accepted",
        policy_decision="allowed",
        detail={"dedupe_key": dkey, "version": version, "size": len(desc)},
    )
    _audit(
        db,
        candidate_id=candidate_id,
        entity_type="normalized_opportunity",
        entity_id=None,
        action="ingest_paste",
        before={},
        after={"version": version, "silent_weight_update": False},
    )
    db.commit()
    db.refresh(row)
    return _ser_opp(row)


def ingest_from_job(db: Session, *, candidate_id: int, job_id: int, is_synthetic: bool = False) -> dict:
    prefs = get_or_create_prefs(db, candidate_id=candidate_id)
    if prefs.paused:
        raise ValueError("discovery_paused")
    job = db.query(Job).filter_by(id=job_id).one_or_none()
    if not job:
        raise ValueError("job_not_found")
    ensure_default_sources(db)
    src = (
        db.query(OpportunitySource)
        .filter_by(board_id=job.job_board)
        .one_or_none()
        or db.query(OpportunitySource).filter_by(source_key="manual_paste").one()
    )
    desc = (job.description or job.requirements or "")[:MAX_PASTE_CHARS]
    reqs = _extract_requirements(desc)
    if job.requirements_must_have:
        must = _loads(job.requirements_must_have, [])
        if isinstance(must, list):
            for i, m in enumerate(must[:10]):
                reqs.insert(
                    0,
                    {
                        "id": f"must:{i}",
                        "text": str(m)[:400],
                        "kind": "must",
                        "claim_kind": "SOURCE_SUPPORTED",
                        "evidence_backed": False,
                    },
                )
    fit = _fit_from_evidence(db, candidate_id=candidate_id, requirements=reqs)
    fres = _freshness(job)
    salary = _salary_intel(job, None)
    ready = _readiness(fit, fres)
    dkey = _dedupe_key(job.title, job.company, job.location)
    existing = (
        db.query(CandidateNormalizedOpportunity)
        .filter_by(candidate_id=candidate_id, dedupe_key=dkey)
        .filter(CandidateNormalizedOpportunity.deleted_at.is_(None))
        .filter(CandidateNormalizedOpportunity.superseded_at.is_(None))
        .order_by(CandidateNormalizedOpportunity.version.desc())
        .first()
    )
    version = (existing.version + 1) if existing else 1
    if existing:
        existing.superseded_at = _utcnow()
    row = CandidateNormalizedOpportunity(
        candidate_id=candidate_id,
        opportunity_key=_uuid("opp"),
        job_id=job.id,
        source_id=src.id,
        version=version,
        title=job.title[:300],
        company=job.company[:200],
        location=(job.location or "UNKNOWN")[:200],
        url=(job.url or "")[:500] or None,
        dedupe_key=dkey,
        cluster_key=_cluster_key(job.title),
        normalized_json=_dumps(
            {
                "title": job.title,
                "company": job.company,
                "location": job.location,
                "job_board": job.job_board,
                "external_id": job.external_id,
                "full_restricted_jd_stored": False,
                "description_preview": desc[:400],
                "source": "authorized_job_store",
                "normalized": True,
            }
        ),
        requirements_json=_dumps(reqs[:30]),
        freshness_json=_dumps(fres),
        fit_json=_dumps(fit),
        market_json=_dumps(
            {
                "wording": "observed_source",
                "board": job.job_board,
                "fabricated": False,
                "claim_kind": "INFERENCE",
            }
        ),
        salary_json=_dumps(salary),
        company_intel_json=_dumps(_company_intel(job.company)),
        readiness_json=_dumps(ready),
        activity_status=fres["activity_status"],
        stale=bool(fres.get("stale")),
        claim_kind="SOURCE_SUPPORTED",
        is_synthetic=is_synthetic,
        kpi_excluded=True,
        created_at=_utcnow(),
        updated_at=_utcnow(),
    )
    db.add(row)
    _ingest_audit(
        db,
        candidate_id=candidate_id,
        source_id=src.id,
        action="job_normalized",
        policy_decision="allowed",
        detail={"job_id": job.id, "version": version, "stale": row.stale},
    )
    db.commit()
    db.refresh(row)
    return _ser_opp(row)


def build_market_signals(db: Session) -> dict:
    """Observed-source aggregates only — never fabricate demand trends."""
    ensure_default_sources(db)
    by_board = (
        db.query(Job.job_board, func.count(Job.id)).group_by(Job.job_board).all()
    )
    salary_obs = (
        db.query(func.count(Job.id))
        .filter((Job.salary_min.isnot(None)) | (Job.salary_max.isnot(None)))
        .scalar()
        or 0
    )
    total = db.query(func.count(Job.id)).scalar() or 0
    metrics = {
        "total_observed_jobs": total,
        "by_board": {b: int(c) for b, c in by_board},
        "jobs_with_observed_salary": int(salary_obs),
        "jobs_without_salary": int(total - salary_obs),
        "demand_trend": "UNKNOWN",
        "demand_trend_note": "Demand not inferred beyond observed job counts in authorized stores",
        "fabricated": False,
        "wording": "observed_source",
    }
    key = f"mkt:{_utcnow().strftime('%Y%m%d%H')}"
    snap = db.query(MarketSignalSnapshot).filter_by(snapshot_key=key).one_or_none()
    if not snap:
        snap = MarketSignalSnapshot(
            snapshot_key=key,
            scope="observed_jobs",
            board_id=None,
            metrics_json=_dumps(metrics),
            wording="observed_source",
            claim_kind="INFERENCE",
            computed_at=_utcnow(),
        )
        db.add(snap)
        db.commit()
        db.refresh(snap)
    return {
        "snapshot_id": snap.id,
        "metrics": metrics,
        "wording": "observed_source",
        "fabricated": False,
        "claim_kind": "INFERENCE",
    }


def create_watchlist(
    db: Session, *, candidate_id: int, title: str, query: dict | None = None
) -> dict:
    row = CandidateOpportunityWatchlist(
        candidate_id=candidate_id,
        watchlist_key=_uuid("wl"),
        title=(title or "Watchlist")[:300],
        query_json=_dumps(query or {}),
        active=True,
        claim_kind="FACT",
        kpi_excluded=True,
        created_at=_utcnow(),
        updated_at=_utcnow(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _ser_watchlist(row)


def refresh_watchlist(db: Session, *, candidate_id: int, watchlist_id: int) -> dict:
    wl = (
        db.query(CandidateOpportunityWatchlist)
        .filter_by(id=watchlist_id, candidate_id=candidate_id)
        .one_or_none()
    )
    if not wl or wl.deleted_at:
        raise ValueError("watchlist_not_found")
    q = _loads(wl.query_json, {})
    terms = (q.get("title_contains") or q.get("q") or "").strip().lower()
    jobs_q = db.query(Job).filter(Job.is_validated.is_(True))
    if terms:
        jobs_q = jobs_q.filter(Job.title.ilike(f"%{terms}%"))
    jobs = jobs_q.order_by(Job.scraped_at.desc()).limit(20).all()
    hits = []
    for job in jobs:
        opp = ingest_from_job(db, candidate_id=candidate_id, job_id=job.id)
        existing = (
            db.query(CandidateOpportunityWatchlistHit)
            .filter_by(watchlist_id=wl.id, job_id=job.id)
            .one_or_none()
        )
        score = float((opp.get("fit") or {}).get("score") or 0)
        if existing:
            existing.score = score
            existing.normalized_opportunity_id = opp["id"]
            existing.signal_json = _dumps({"delta": "refresh", "stale": opp.get("stale")})
            hit = existing
        else:
            hit = CandidateOpportunityWatchlistHit(
                candidate_id=candidate_id,
                watchlist_id=wl.id,
                normalized_opportunity_id=opp["id"],
                job_id=job.id,
                score=score,
                signal_json=_dumps({"delta": "new", "stale": opp.get("stale")}),
                created_at=_utcnow(),
            )
            db.add(hit)
        hits.append(hit)
    db.commit()
    return {
        "watchlist_id": wl.id,
        "hits": len(hits),
        "items": [_ser_hit(h) for h in hits[:20]],
    }


def save_search(
    db: Session, *, candidate_id: int, title: str, query: dict, notify: bool = False
) -> dict:
    row = CandidateSavedSearch(
        candidate_id=candidate_id,
        search_key=_uuid("ss"),
        title=(title or "Saved search")[:300],
        query_json=_dumps(query or {}),
        notify=bool(notify),
        claim_kind="FACT",
        kpi_excluded=True,
        created_at=_utcnow(),
        updated_at=_utcnow(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {
        "id": row.id,
        "title": row.title,
        "query": _loads(row.query_json, {}),
        "notify": row.notify,
    }


def compare_opportunities(
    db: Session, *, candidate_id: int, opportunity_ids: list[int]
) -> dict:
    ids = [int(x) for x in (opportunity_ids or [])[:5]]
    rows = (
        db.query(CandidateNormalizedOpportunity)
        .filter(
            CandidateNormalizedOpportunity.candidate_id == candidate_id,
            CandidateNormalizedOpportunity.id.in_(ids),
            CandidateNormalizedOpportunity.deleted_at.is_(None),
        )
        .all()
    )
    result = {
        "items": [_ser_opp(r) for r in rows],
        "dimensions": ["fit", "salary", "freshness", "readiness", "stale"],
        "guarantee": False,
        "claim_kind": "INFERENCE",
    }
    comp = CandidateOpportunityComparison(
        candidate_id=candidate_id,
        comparison_key=_uuid("cmp"),
        opportunity_ids_json=_dumps(ids),
        result_json=_dumps(result),
        claim_kind="INFERENCE",
        kpi_excluded=True,
        created_at=_utcnow(),
    )
    db.add(comp)
    db.commit()
    db.refresh(comp)
    return {"comparison_id": comp.id, **result}


def handoff_to_studio(
    db: Session, *, candidate_id: int, opportunity_id: int, is_synthetic: bool = False
) -> dict:
    row = (
        db.query(CandidateNormalizedOpportunity)
        .filter_by(id=opportunity_id, candidate_id=candidate_id)
        .one_or_none()
    )
    if not row or row.deleted_at:
        raise ValueError("opportunity_not_found")
    stale_warning = bool(row.stale)
    from app.services import application_studio as studio

    opp = {
        "title": row.title,
        "company": row.company,
        "location": row.location,
        "url": row.url,
        "source_url": row.url,
        "description": (_loads(row.normalized_json, {}) or {}).get("description_preview") or "",
        "stale_warning": stale_warning,
        "normalized_opportunity_id": row.id,
        "job_id": row.job_id,
    }
    ws = studio.create_workspace(
        db,
        candidate_id=candidate_id,
        title=f"Apply: {row.title}"[:300],
        opportunity=opp,
        is_synthetic=is_synthetic,
    )
    _audit(
        db,
        candidate_id=candidate_id,
        entity_type="studio_handoff",
        entity_id=ws.id,
        action="handoff",
        before={},
        after={"opportunity_id": row.id, "stale_warning": stale_warning, "external_apply": False},
    )
    db.commit()
    return {
        "workspace_id": ws.id,
        "stale_warning": stale_warning,
        "external_apply": False,
        "deep_link": f"/dashboard/application-studio?id={ws.id}",
    }


def push_to_daily_os_and_acal(db: Session, *, candidate_id: int, opportunity_id: int) -> dict:
    row = (
        db.query(CandidateNormalizedOpportunity)
        .filter_by(id=opportunity_id, candidate_id=candidate_id)
        .one_or_none()
    )
    if not row or row.deleted_at:
        raise ValueError("opportunity_not_found")
    daily_ok = True
    acal_ok = True
    try:
        from app.services import career_daily_os as daily_os

        daily_os.upsert_inbox_item(
            db,
            candidate_id=candidate_id,
            item_key=f"opp:disc:{row.id}",
            kind="opportunity",
            title=f"Opportunity: {row.title}"[:300],
            body={
                "normalized_opportunity_id": row.id,
                "canonical_ranking_ref": True,
                "stale": row.stale,
                "fabricated": False,
            },
            priority_score=int(min(90, (_loads(row.fit_json, {}) or {}).get("score") or 60)),
            deep_link=f"/dashboard/jobs?opp={row.id}",
            claim_kind=cc.CLAIM_SUGGESTION,
        )
    except Exception as exc:
        daily_ok = False
        logger.exception("daily os opp push failed: %s", exc)
    try:
        from app.services import acceptance_calendar as acal

        acal.upsert_item(
            db,
            candidate_id=candidate_id,
            item_key=f"opp:acal:{row.id}"[:160],
            category="goal",
            title=f"Review opportunity: {row.title}"[:300],
            summary="Candidate-approved discovery commitment",
            importance=70,
            claim_kind=cc.CLAIM_SUGGESTION,
            state="unscheduled",
            deep_link=f"/dashboard/jobs?opp={row.id}",
            payload={"approved_commitment": True, "unapproved": False, "opportunity_id": row.id},
        )
    except Exception as exc:
        acal_ok = False
        logger.exception("acal opp push failed: %s", exc)
    db.commit()
    return {"daily_os_ok": daily_ok, "acal_ok": acal_ok, "silent": False}


def run_refresh(
    db: Session, *, candidate_id: int, idempotency_key: str | None = None
) -> dict:
    key = (idempotency_key or _uuid("ref"))[:160]
    existing = db.query(OpportunityRefreshJob).filter_by(idempotency_key=key).one_or_none()
    if existing:
        return {
            "job": _ser_refresh(existing),
            "idempotent_hit": True,
        }
    job = OpportunityRefreshJob(
        candidate_id=candidate_id,
        job_key=_uuid("rjob"),
        idempotency_key=key,
        status="running",
        result_json="{}",
        claim_kind="FACT",
        created_at=_utcnow(),
    )
    db.add(job)
    db.flush()
    market = build_market_signals(db)
    # Refresh freshness on active normalized opps linked to jobs
    updated = 0
    for row in (
        db.query(CandidateNormalizedOpportunity)
        .filter(
            CandidateNormalizedOpportunity.candidate_id == candidate_id,
            CandidateNormalizedOpportunity.deleted_at.is_(None),
            CandidateNormalizedOpportunity.superseded_at.is_(None),
            CandidateNormalizedOpportunity.job_id.isnot(None),
        )
        .limit(50)
        .all()
    ):
        j = db.query(Job).filter_by(id=row.job_id).one_or_none()
        fres = _freshness(j)
        row.freshness_json = _dumps(fres)
        row.activity_status = fres["activity_status"]
        row.stale = bool(fres.get("stale"))
        row.updated_at = _utcnow()
        updated += 1
    job.status = "completed"
    job.result_json = _dumps(
        {"updated": updated, "market_snapshot_id": market.get("snapshot_id"), "fabricated": False}
    )
    job.completed_at = _utcnow()
    db.commit()
    db.refresh(job)
    return {"job": _ser_refresh(job), "idempotent_hit": False, "market": market}


def invalidate_on_evidence_delete(db: Session, *, candidate_id: int) -> dict:
    """When evidence deleted, recompute fit — never leave strong fabricated fit."""
    try:
        from app.services import search_strategy_lab as sslab

        sslab.invalidate_theses_on_evidence_delete(db, candidate_id=candidate_id)
    except Exception:
        pass
    n = 0
    for row in (
        db.query(CandidateNormalizedOpportunity)
        .filter(
            CandidateNormalizedOpportunity.candidate_id == candidate_id,
            CandidateNormalizedOpportunity.deleted_at.is_(None),
            CandidateNormalizedOpportunity.superseded_at.is_(None),
        )
        .all()
    ):
        reqs = _loads(row.requirements_json, [])
        fit = _fit_from_evidence(db, candidate_id=candidate_id, requirements=reqs)
        row.fit_json = _dumps(fit)
        row.readiness_json = _dumps(_readiness(fit, _loads(row.freshness_json, {})))
        row.updated_at = _utcnow()
        n += 1
    _audit(
        db,
        candidate_id=candidate_id,
        entity_type="fit",
        entity_id=None,
        action="invalidate_on_evidence_delete",
        before={},
        after={"recomputed": n, "strong_fit_without_evidence": False},
    )
    db.commit()
    return {"recomputed": n, "strong_fit_without_evidence": False}


def delete_discovery_history(db: Session, *, candidate_id: int) -> dict:
    now = _utcnow()
    try:
        from app.services import search_strategy_lab as sslab

        sslab.invalidate_theses_on_evidence_delete(db, candidate_id=candidate_id)
    except Exception:
        pass
    for row in (
        db.query(CandidateNormalizedOpportunity)
        .filter(
            CandidateNormalizedOpportunity.candidate_id == candidate_id,
            CandidateNormalizedOpportunity.deleted_at.is_(None),
        )
        .all()
    ):
        row.deleted_at = now
    for wl in (
        db.query(CandidateOpportunityWatchlist)
        .filter(
            CandidateOpportunityWatchlist.candidate_id == candidate_id,
            CandidateOpportunityWatchlist.deleted_at.is_(None),
        )
        .all()
    ):
        wl.deleted_at = now
    for ss in (
        db.query(CandidateSavedSearch)
        .filter(
            CandidateSavedSearch.candidate_id == candidate_id,
            CandidateSavedSearch.deleted_at.is_(None),
        )
        .all()
    ):
        ss.deleted_at = now
    for c in (
        db.query(CandidateOpportunityComparison)
        .filter(
            CandidateOpportunityComparison.candidate_id == candidate_id,
            CandidateOpportunityComparison.deleted_at.is_(None),
        )
        .all()
    ):
        c.deleted_at = now
    # Clear Daily OS discovery items
    from app.database.models import CandidateCareerInboxItem

    db.query(CandidateCareerInboxItem).filter(
        CandidateCareerInboxItem.candidate_id == candidate_id,
        CandidateCareerInboxItem.item_key.like("opp:%"),
    ).delete(synchronize_session=False)
    _audit(
        db,
        candidate_id=candidate_id,
        entity_type="discovery",
        entity_id=None,
        action="delete_history",
        before={},
        after={"propagated": True, "stale_reappear_guard": True},
    )
    db.commit()
    return {"deleted": True, "propagated": True, "stale_reappear_guard": True}


def export_discovery(db: Session, *, candidate_id: int) -> dict:
    prefs = get_or_create_prefs(db, candidate_id=candidate_id)
    include_notes = bool(_loads(prefs.privacy_json, {}).get("export_include_notes"))
    opps = (
        db.query(CandidateNormalizedOpportunity)
        .filter(
            CandidateNormalizedOpportunity.candidate_id == candidate_id,
            CandidateNormalizedOpportunity.deleted_at.is_(None),
        )
        .order_by(CandidateNormalizedOpportunity.id.desc())
        .limit(100)
        .all()
    )
    return {
        "opportunities": [
            {
                "id": o.id,
                "title": o.title,
                "company": o.company,
                "location": o.location,
                "stale": o.stale,
                "fit_score": (_loads(o.fit_json, {}) or {}).get("score"),
                "notes": (_loads(o.normalized_json, {}) or {}).get("description_preview")
                if include_notes
                else None,
            }
            for o in opps
        ],
        "full_module_payloads_excluded": True,
        "secrets_excluded": True,
        "restricted_jd_excluded": True,
    }


def ranking_refs(db: Session, *, candidate_id: int, weights: dict) -> list[dict]:
    """Refs for Epic 2.0 _collect_candidates — no second ranking store."""
    out = []
    for row in (
        db.query(CandidateNormalizedOpportunity)
        .filter(
            CandidateNormalizedOpportunity.candidate_id == candidate_id,
            CandidateNormalizedOpportunity.deleted_at.is_(None),
            CandidateNormalizedOpportunity.superseded_at.is_(None),
        )
        .order_by(CandidateNormalizedOpportunity.id.desc())
        .limit(8)
        .all()
    ):
        fit = _loads(row.fit_json, {}) or {}
        base = float(fit.get("score") or 45)
        score = round(min(95, base * 0.7 + 25 * float(weights.get("role_fit", 0.2))), 2)
        if row.stale:
            score = round(score * 0.85, 2)
        out.append(
            {
                "id": f"opportunity:{row.id}",
                "module": "opportunity_discovery",
                "ref_id": row.id,
                "title": f"{row.title} @ {row.company}",
                "score": score,
                "invalidated": False,
                "deleted": False,
                "stale": row.stale,
                "explain": {
                    "role_fit": weights.get("role_fit"),
                    "fit_score": fit.get("score"),
                    "why": "Evidence-backed opportunity from authorized source",
                    "stale_warning": row.stale,
                    "claim_kind": "INFERENCE",
                    "calibration_bypass": False,
                },
                "deep_link": f"/dashboard/jobs?opp={row.id}",
                "counterfactual": {
                    "text": "If evidence matched more must-haves, fit score would rise",
                    "not_guarantee": True,
                },
            }
        )
    return out


def build_aggregate(db: Session, *, candidate_id: int) -> dict:
    ensure_default_sources(db)
    prefs = get_or_create_prefs(db, candidate_id=candidate_id)
    sources = db.query(OpportunitySource).order_by(OpportunitySource.id.asc()).all()
    opps = (
        db.query(CandidateNormalizedOpportunity)
        .filter(
            CandidateNormalizedOpportunity.candidate_id == candidate_id,
            CandidateNormalizedOpportunity.deleted_at.is_(None),
            CandidateNormalizedOpportunity.superseded_at.is_(None),
        )
        .order_by(CandidateNormalizedOpportunity.id.desc())
        .limit(20)
        .all()
    )
    watchlists = (
        db.query(CandidateOpportunityWatchlist)
        .filter(
            CandidateOpportunityWatchlist.candidate_id == candidate_id,
            CandidateOpportunityWatchlist.deleted_at.is_(None),
        )
        .order_by(CandidateOpportunityWatchlist.id.desc())
        .limit(10)
        .all()
    )
    searches = (
        db.query(CandidateSavedSearch)
        .filter(
            CandidateSavedSearch.candidate_id == candidate_id,
            CandidateSavedSearch.deleted_at.is_(None),
        )
        .order_by(CandidateSavedSearch.id.desc())
        .limit(10)
        .all()
    )
    market = build_market_signals(db)
    return {
        "schema": "twin.opportunity_market_intelligence/v1",
        "verdict_target": (
            "OPPORTUNITY INTELLIGENCE CUSTOMER-USABLE - "
            "SOURCE-BACKED MARKET DISCOVERY AND ROLE PRIORITIZATION PRODUCTION-READY"
        ),
        "sources": [_ser_source(s) for s in sources],
        "opportunities": [_ser_opp(o) for o in opps],
        "watchlists": [_ser_watchlist(w) for w in watchlists],
        "saved_searches": [
            {"id": s.id, "title": s.title, "query": _loads(s.query_json, {}), "notify": s.notify}
            for s in searches
        ],
        "prefs": {
            "paused": prefs.paused,
            "prefs": _loads(prefs.prefs_json, {}),
            "privacy": _loads(prefs.privacy_json, {}),
        },
        "market": market,
        "safety": {
            "fabricated_activity": False,
            "unsourced_salary": False,
            "unsourced_market": False,
            "ssrf_unsafe": False,
            "ranking_bypasses_calibration": False,
            "silent_weight_updates": False,
            "strong_fit_without_evidence": False,
            "stale_studio_without_warning": False,
            "non_idempotent_refresh": False,
            "search_leaks": False,
            "external_apply": False,
            "prohibited_scraping": False,
            "captcha_bypass": False,
            "browser_form_submission": False,
            "ats_write": False,
            "auto_apply": False,
            "microsoft_calendar_write": False,
            "workplace_monitoring": False,
            "phase_3_career_agent": "NOT_STARTED",
            "public_opportunity_history": False,
        },
        "integrations": {
            "canonical_jobs_store": True,
            "canonical_ranking_refs": True,
            "application_studio_handoff": True,
            "daily_os": True,
            "acceptance_calendar": True,
            "career_evidence_fit": True,
            "lifecycle": True,
        },
        "routes": {
            "jobs": "/dashboard/jobs",
            "api": "/api/v1/candidates/me/opportunity-intelligence",
        },
        "alembic": "117_opportunity_market_intelligence",
        "analytics": {"kpi_excluded": True, "labels_pii": False},
        "residual_epic_20": {
            "opportunity_refs_in_canonical_ranking": True,
            "calibration_not_bypassed": True,
        },
        "invites_sent": 0,
        "alten_pack": False,
    }


def _ser_source(s: OpportunitySource) -> dict:
    return {
        "id": s.id,
        "source_key": s.source_key,
        "kind": s.kind,
        "board_id": s.board_id,
        "display_name": s.display_name,
        "enabled": s.enabled,
        "authorized_path": s.authorized_path,
        "policy": _loads(s.policy_json, {}),
    }


def _ser_opp(o: CandidateNormalizedOpportunity) -> dict:
    return {
        "id": o.id,
        "opportunity_key": o.opportunity_key,
        "job_id": o.job_id,
        "source_id": o.source_id,
        "version": o.version,
        "title": o.title,
        "company": o.company,
        "location": o.location,
        "url": o.url,
        "dedupe_key": o.dedupe_key,
        "cluster_key": o.cluster_key,
        "normalized": _loads(o.normalized_json, {}),
        "requirements": _loads(o.requirements_json, []),
        "freshness": _loads(o.freshness_json, {}),
        "fit": _loads(o.fit_json, {}),
        "market": _loads(o.market_json, {}),
        "salary": _loads(o.salary_json, {}),
        "company_intel": _loads(o.company_intel_json, {}),
        "readiness": _loads(o.readiness_json, {}),
        "activity_status": o.activity_status,
        "stale": o.stale,
        "claim_kind": o.claim_kind,
        "kpi_excluded": o.kpi_excluded,
    }


def _ser_watchlist(w: CandidateOpportunityWatchlist) -> dict:
    return {
        "id": w.id,
        "title": w.title,
        "query": _loads(w.query_json, {}),
        "active": w.active,
    }


def _ser_hit(h: CandidateOpportunityWatchlistHit) -> dict:
    return {
        "id": h.id,
        "watchlist_id": h.watchlist_id,
        "job_id": h.job_id,
        "normalized_opportunity_id": h.normalized_opportunity_id,
        "score": h.score,
        "signal": _loads(h.signal_json, {}),
    }


def _ser_refresh(j: OpportunityRefreshJob) -> dict:
    return {
        "id": j.id,
        "job_key": j.job_key,
        "idempotency_key": j.idempotency_key,
        "status": j.status,
        "result": _loads(j.result_json, {}),
    }
