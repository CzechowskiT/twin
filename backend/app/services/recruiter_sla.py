"""Recruiter SLA tracking — targets + breach summary from live applications."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import Application, Job, RecruiterSlaTarget
from app.services.recruiter_inbox import _require_company_slug

DEFAULT_TARGETS: dict[str, int] = {
    "pending": 48,
    "reviewing": 72,
    "interview": 120,
    "offer": 168,
}


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def list_sla_targets(db: Session, *, company_slug: str) -> list[dict[str, Any]]:
    slug = _require_company_slug(company_slug)
    rows = (
        db.query(RecruiterSlaTarget)
        .filter(RecruiterSlaTarget.company_slug == slug)
        .order_by(RecruiterSlaTarget.stage_key.asc())
        .all()
    )
    if not rows:
        return [
            {"stage_key": k, "target_hours": v, "source": "default"}
            for k, v in DEFAULT_TARGETS.items()
        ]
    return [
        {
            "id": r.id,
            "stage_key": r.stage_key,
            "target_hours": r.target_hours,
            "source": "persisted",
            "updated_at": r.updated_at.isoformat() + "Z" if r.updated_at else None,
        }
        for r in rows
    ]


def upsert_sla_targets(
    db: Session,
    *,
    company_slug: str,
    targets: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    slug = _require_company_slug(company_slug)
    now = _utcnow()
    for item in targets:
        stage = str(item.get("stage_key") or "").strip().lower()
        hours = int(item.get("target_hours") or 0)
        if not stage or hours < 1 or hours > 720:
            continue
        row = (
            db.query(RecruiterSlaTarget)
            .filter(
                RecruiterSlaTarget.company_slug == slug,
                RecruiterSlaTarget.stage_key == stage,
            )
            .one_or_none()
        )
        if row is None:
            row = RecruiterSlaTarget(company_slug=slug, stage_key=stage, target_hours=hours)
            db.add(row)
        else:
            row.target_hours = hours
            row.updated_at = now
    db.commit()
    return list_sla_targets(db, company_slug=slug)


def _target_map(db: Session, *, company_slug: str) -> dict[str, int]:
    rows = list_sla_targets(db, company_slug=company_slug)
    return {r["stage_key"]: int(r["target_hours"]) for r in rows}


def build_sla_summary(db: Session, *, company_slug: str) -> dict[str, Any]:
    slug = _require_company_slug(company_slug)
    targets = _target_map(db, company_slug=slug)
    apps = (
        db.query(Application, Job)
        .join(Job, Application.job_id == Job.id)
        .filter(Job.job_board == "employer", Job.external_id.like(f"{slug}-%"))
        .all()
    )
    now = _utcnow()
    open_ages: list[dict[str, Any]] = []
    breaches: list[dict[str, Any]] = []
    by_stage: dict[str, dict[str, int]] = {}

    for app, job in apps:
        stage = (app.recruiter_pipeline_status or "").strip().lower()
        if not stage:
            status = app.status.value if hasattr(app.status, "value") else str(app.status)
            stage = status.lower()
        if stage in {"hired", "rejected", "withdrawn", "closed"}:
            continue
        anchor = app.updated_at or app.applied_at or now
        if anchor.tzinfo is None:
            anchor = anchor.replace(tzinfo=timezone.utc)
        age_hours = max(0, int((now - anchor).total_seconds() // 3600))
        target = targets.get(stage) or targets.get("pending") or 48
        bucket = by_stage.setdefault(stage, {"open": 0, "breached": 0})
        bucket["open"] += 1
        item = {
            "application_id": app.id,
            "job_id": job.id,
            "stage_key": stage,
            "age_hours": age_hours,
            "target_hours": target,
            "breached": age_hours > target,
        }
        open_ages.append(item)
        if item["breached"]:
            bucket["breached"] += 1
            breaches.append(item)

    breaches.sort(key=lambda x: (-x["age_hours"], x["application_id"]))
    return {
        "company_slug": slug,
        "source": "workspace",
        "generated_at": now.isoformat(),
        "targets": [{"stage_key": k, "target_hours": v} for k, v in sorted(targets.items())],
        "open_count": len(open_ages),
        "breach_count": len(breaches),
        "by_stage": by_stage,
        "breaches": breaches[:50],
        "sample_metrics": False,
    }
