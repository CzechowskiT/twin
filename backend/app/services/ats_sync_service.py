"""ATS completion — vacancy import preview + dry-run/live sync gates."""

from __future__ import annotations

import hashlib
import json
import logging
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import (
    AtsSyncAttempt,
    FeatureFlagState,
    Job,
    RecruiterAtsOAuthConnection,
)
from app.services import ats_harvest_client as harvest
from app.services import ats_lever_client as lever
from app.services.platform_foundations import record_domain_event
from app.services.token_crypto import decrypt_secret

logger = logging.getLogger(__name__)

_SUPPORTED_PROVIDERS = frozenset({"greenhouse", "lever"})


def _now() -> datetime:
    return datetime.now(timezone.utc)


def is_ats_live_sync_enabled(db: Session) -> bool:
    row = (
        db.query(FeatureFlagState)
        .filter(FeatureFlagState.flag_key == "ATS_LIVE_SYNC")
        .one_or_none()
    )
    return bool(row and row.enabled)


def _token_present(row: RecruiterAtsOAuthConnection) -> bool:
    return bool(row.oauth_access_token_encrypted)


def ats_connection_status(db: Session, *, user_id: int | None = None) -> dict[str, Any]:
    q = db.query(RecruiterAtsOAuthConnection)
    if user_id is not None:
        q = q.filter(RecruiterAtsOAuthConnection.user_id == user_id)
    rows = q.all()
    providers = {
        r.provider: {
            "status": r.status,
            "connected": r.status == "connected" and _token_present(r),
            "updated_at": r.updated_at.isoformat() + "Z" if r.updated_at else None,
        }
        for r in rows
    }
    any_connected = any(v["connected"] for v in providers.values())
    return {
        "providers": providers,
        "any_connected": any_connected,
        "vacancy_import": "READY" if any_connected else "NEEDS_OAUTH",
        "ats_live_sync": "LIVE" if is_ats_live_sync_enabled(db) else "BLOCKED",
        "ats_live_sync_flag": is_ats_live_sync_enabled(db),
        "supported_providers": sorted(_SUPPORTED_PROVIDERS),
        "sync_attempts_table": "ats_sync_attempts",
    }


def _token_for(db: Session, user_id: int, provider: str) -> str:
    row = (
        db.query(RecruiterAtsOAuthConnection)
        .filter(
            RecruiterAtsOAuthConnection.user_id == user_id,
            RecruiterAtsOAuthConnection.provider == provider,
            RecruiterAtsOAuthConnection.status == "connected",
        )
        .one_or_none()
    )
    if row is None or not row.oauth_access_token_encrypted:
        raise ValueError("ats_not_connected")
    token = decrypt_secret(row.oauth_access_token_encrypted)
    if not token:
        raise ValueError("ats_token_decrypt_failed")
    return token


def _normalize_jobs(provider: str, posts: list[dict[str, Any]]) -> list[dict[str, Any]]:
    jobs: list[dict[str, Any]] = []
    for p in posts:
        ext = str(p.get("id") or p.get("job_id") or "")
        if not ext:
            continue
        loc = p.get("location") or p.get("categories") or ""
        if isinstance(loc, dict):
            loc = loc.get("name") or loc.get("location") or ""
        elif isinstance(loc, list) and loc:
            first = loc[0]
            loc = first.get("name") if isinstance(first, dict) else str(first)
        title = p.get("title") or p.get("text") or p.get("name") or "Untitled"
        jobs.append(
            {
                "external_id": ext[:100],
                "title": str(title)[:200],
                "location": str(loc or "")[:120],
                "live": bool(p.get("live", p.get("state") != "closed")),
                "provider": provider,
            }
        )
    return jobs


def _list_provider_posts(provider: str, token: str) -> list[dict[str, Any]]:
    if provider == "greenhouse":
        return harvest.list_job_posts(token)
    if provider == "lever":
        return lever.list_postings(token)
    return []


def honest_empty_preview(
    db: Session,
    *,
    provider: str = "greenhouse",
    reason: str = "NEEDS_OAUTH",
) -> dict[str, Any]:
    """Schema-stable vacancy preview without OAuth / Harvest — no fake jobs."""
    pid = (provider or "greenhouse").strip().lower()
    return {
        "provider": pid,
        "jobs": [],
        "total": 0,
        "reason": reason,
        "vacancy_import": "NEEDS_OAUTH" if reason in {"NEEDS_OAUTH", "NEEDS_AUTH"} else reason,
        "source": "honesty",
        "writeback": False,
        "ats_live_sync": "BLOCKED" if not is_ats_live_sync_enabled(db) else "LIVE",
        "note": "Connect Greenhouse Harvest or Lever OAuth to load live vacancy preview.",
    }


def list_vacancy_import_preview(
    db: Session,
    *,
    user_id: int,
    provider: str = "greenhouse",
) -> dict[str, Any]:
    pid = (provider or "greenhouse").strip().lower()
    if pid not in _SUPPORTED_PROVIDERS:
        return honest_empty_preview(db, provider=pid, reason="UNSUPPORTED_PROVIDER")
    status = ats_connection_status(db, user_id=user_id)
    if not status["providers"].get(pid, {}).get("connected"):
        return honest_empty_preview(db, provider=pid, reason="NEEDS_OAUTH")
    try:
        token = _token_for(db, user_id, pid)
        posts = _list_provider_posts(pid, token)
    except ValueError as exc:
        return {
            "provider": pid,
            "jobs": [],
            "total": 0,
            "reason": str(exc),
            "vacancy_import": "PROVIDER_ERROR",
            "source": "live",
            "writeback": False,
            "ats_live_sync": status["ats_live_sync"],
        }
    jobs = _normalize_jobs(pid, posts)
    return {
        "provider": pid,
        "jobs": jobs,
        "total": len(jobs),
        "vacancy_import": "READY",
        "source": "harvest" if pid == "greenhouse" else "lever",
        "writeback": False,
        "ats_live_sync": status["ats_live_sync"],
    }


def import_vacancies(
    db: Session,
    *,
    user_id: int,
    company_slug: str,
    provider: str,
    job_post_ids: list[str],
    dry_run: bool = True,
) -> dict[str, Any]:
    slug = (company_slug or "").strip()[:80]
    if not slug:
        raise ValueError("company_slug_required")
    preview = list_vacancy_import_preview(db, user_id=user_id, provider=provider)
    wanted = {str(x) for x in job_post_ids}
    selected = (
        [j for j in preview.get("jobs", []) if j["external_id"] in wanted]
        if wanted
        else list(preview.get("jobs", []))
    )
    if dry_run:
        record_domain_event(
            db,
            event_name="ats.vacancy_import_dry_run",
            aggregate_type="organization_tenant",
            aggregate_id=slug,
            payload={"provider": provider, "count": len(selected), "user_id": user_id},
        )
        return {
            "dry_run": True,
            "imported": 0,
            "preview_count": len(selected),
            "jobs": selected,
            "company_slug": slug,
            "vacancy_import": preview.get("vacancy_import"),
            "reason": preview.get("reason"),
        }
    if preview.get("vacancy_import") != "READY":
        raise ValueError(str(preview.get("reason") or "vacancy_import_not_ready"))
    created = 0
    board = f"ats:{provider}"
    for item in selected:
        ext = item["external_id"][:100]
        existing = (
            db.query(Job)
            .filter(Job.job_board == board, Job.external_id == ext)
            .one_or_none()
        )
        if existing is not None:
            continue
        job = Job(
            job_board=board,
            external_id=ext,
            title=item["title"][:300],
            company=slug.replace("-", " ").title()[:200],
            location=(item.get("location") or "Remote")[:200],
            description=f"Imported from {provider} job_post {ext}",
            url=f"https://twin.internal/ats/{provider}/{ext}",
            is_validated=True,
            role_status="open",
        )
        db.add(job)
        created += 1
    db.commit()
    record_domain_event(
        db,
        event_name="ats.vacancy_import",
        aggregate_type="organization_tenant",
        aggregate_id=slug,
        payload={"provider": provider, "created": created, "user_id": user_id},
    )
    return {"dry_run": False, "imported": created, "company_slug": slug, "provider": provider}


def _provider_dry_run_payload(
    *,
    provider: str,
    application_id: int,
    access_token: str | None = None,
) -> dict[str, Any]:
    pid = (provider or "greenhouse").strip().lower()
    if pid == "lever":
        return lever.dry_run_write_opportunity(access_token, application_id=application_id)
    return harvest.dry_run_write_candidate(access_token, application_id=application_id)


def enqueue_ats_write_dry_run(
    db: Session,
    *,
    company_slug: str,
    application_id: int,
    provider: str = "greenhouse",
    user_id: int | None = None,
) -> dict[str, Any]:
    """Record an evidence row in ``ats_sync_attempts`` — no live ATS mutation."""
    slug = (company_slug or "").strip()[:80]
    pid = (provider or "greenhouse").strip().lower()[:32]
    token: str | None = None
    if user_id and user_id > 0:
        try:
            token = _token_for(db, user_id, pid)
        except ValueError:
            token = None
    provider_payload = _provider_dry_run_payload(
        provider=pid,
        application_id=application_id,
        access_token=token,
    )
    attempt = AtsSyncAttempt(
        company_slug=slug,
        provider=pid,
        direction="write",
        external_id=str(application_id),
        dry_run=True,
        status="dry_run_ok",
        payload_json=json.dumps(
            {
                "application_id": application_id,
                "ats_write": False,
                "provider_payload": provider_payload,
                "evidence": "investor_sor_proof_ats",
            }
        ),
        error_code=None,
        created_at=_now(),
        updated_at=_now(),
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)
    record_domain_event(
        db,
        event_name="ats.sync_dry_run",
        aggregate_type="ats_sync_attempt",
        aggregate_id=str(attempt.id),
        payload={
            "application_id": application_id,
            "company_slug": slug,
            "provider": pid,
            "evidence": "investor_sor_proof_ats",
        },
    )
    return {
        "attempt_id": attempt.id,
        "dry_run": True,
        "ats_write": False,
        "status": attempt.status,
        "provider": pid,
        "ats_live_sync": "BLOCKED" if not is_ats_live_sync_enabled(db) else "LIVE",
        "evidence_table": "ats_sync_attempts",
        "provider_payload": provider_payload,
    }


def enqueue_ats_write(
    db: Session,
    *,
    company_slug: str,
    application_id: int,
    provider: str = "greenhouse",
    live: bool = False,
) -> dict[str, Any]:
    if not live or not is_ats_live_sync_enabled(db):
        raise ValueError("ats_live_sync_blocked")
    slug = (company_slug or "").strip()[:80]
    pid = (provider or "greenhouse").strip().lower()[:32]
    dedupe = hashlib.sha256(f"{slug}:{application_id}:{pid}".encode()).hexdigest()[:24]
    attempt = AtsSyncAttempt(
        company_slug=slug,
        provider=pid,
        direction="write",
        external_id=str(application_id),
        dry_run=False,
        status="queued",
        payload_json=json.dumps(
            {"application_id": application_id, "dedupe": dedupe, "ats_write": True}
        ),
        error_code=None,
        created_at=_now(),
        updated_at=_now(),
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)
    record_domain_event(
        db,
        event_name="ats.sync_write_queued",
        aggregate_type="ats_sync_attempt",
        aggregate_id=str(attempt.id),
        payload={"application_id": application_id, "company_slug": slug, "provider": pid},
    )
    return {"attempt_id": attempt.id, "dry_run": False, "ats_write": True, "status": "queued"}


def list_sync_attempts(
    db: Session,
    *,
    company_slug: str | None = None,
    limit: int = 25,
) -> dict[str, Any]:
    """Investor SOR proof ATS — evidence rows without claiming live write."""
    q = db.query(AtsSyncAttempt).order_by(AtsSyncAttempt.id.desc())
    if company_slug:
        q = q.filter(AtsSyncAttempt.company_slug == (company_slug or "").strip()[:80])
    rows = q.limit(max(1, min(limit, 100))).all()
    return {
        "table": "ats_sync_attempts",
        "module_id": "investor_sor_proof_ats",
        "ats_live_sync": "BLOCKED" if not is_ats_live_sync_enabled(db) else "LIVE",
        "smoke_proves": (
            "Dry-run sync attempts + vacancy preview readiness without live ATS write. "
            "PASS Hard LIVE write only after OAuth + ATS_LIVE_SYNC + prod smoke."
        ),
        "attempts": [
            {
                "id": r.id,
                "company_slug": r.company_slug,
                "provider": r.provider,
                "direction": r.direction,
                "external_id": r.external_id,
                "dry_run": r.dry_run,
                "status": r.status,
                "error_code": r.error_code,
                "created_at": r.created_at.isoformat() + "Z" if r.created_at else None,
            }
            for r in rows
        ],
        "total": len(rows),
    }


def export_sync_proposal(db: Session, *, attempt_id: int) -> dict[str, Any]:
    """CORE_PILOT export of one ATS sync proposal for human approval.

    Live Greenhouse/Lever write remains OPTIONAL_INTEGRATION — this returns the
    dry-run payload only.
    """
    row = db.query(AtsSyncAttempt).filter(AtsSyncAttempt.id == attempt_id).one_or_none()
    if row is None:
        raise ValueError("attempt_not_found")
    payload: Any = None
    if row.payload_json:
        try:
            payload = json.loads(row.payload_json)
        except json.JSONDecodeError:
            payload = {"raw": row.payload_json}
    return {
        "module_id": "investor_sor_proof_ats",
        "product_inclusion": "CORE_PILOT",
        "export_kind": "ats_sync_proposal",
        "live_partner_write": "OPTIONAL_INTEGRATION",
        "ats_live_sync_enabled": is_ats_live_sync_enabled(db),
        "attempt": {
            "id": row.id,
            "company_slug": row.company_slug,
            "provider": row.provider,
            "direction": row.direction,
            "external_id": row.external_id,
            "dry_run": row.dry_run,
            "status": row.status,
            "error_code": row.error_code,
            "created_at": row.created_at.isoformat() + "Z" if row.created_at else None,
            "payload": payload,
        },
        "approval_required_before_live_write": True,
        "honesty": (
            "Proposal/export for approval only. Greenhouse/Lever live write is optional "
            "and blocked unless ATS_LIVE_SYNC is explicitly enabled."
        ),
    }
