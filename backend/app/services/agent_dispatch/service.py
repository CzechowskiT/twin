"""Agent Dispatcher orchestration — create, poll, cancel, enrich, recover."""

from __future__ import annotations

import hashlib
import json
import logging
import secrets
import uuid
from datetime import datetime, timedelta
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import Settings
from app.database.models import (
    AgentDispatchRun,
    AgentDispatchWebhookEvent,
)
from app.services.agent_dispatch.audit import write_audit
from app.services.agent_dispatch.auth import AgentDispatchPrincipal
from app.services.agent_dispatch.constants import (
    ACTIVE_LOCK_STATUSES,
    CURSOR_V0_ERROR,
    CURSOR_V0_FINISHED,
    CURSOR_V1_RUN_CANCELLED,
    CURSOR_V1_RUN_ERROR,
    CURSOR_V1_RUN_EXPIRED,
    CURSOR_V1_RUN_FINISHED,
    CURSOR_V1_TERMINAL,
    DEFAULT_EXECUTION_POLICY,
    DISPATCH_RUN_TERMINAL,
    DispatchRunStatus,
)
from app.services.agent_dispatch.cursor_client import (
    CursorApiError,
    CursorCloudAgentsClient,
)
from app.services.agent_dispatch.github_enricher import GitHubEnricher
from app.services.agent_dispatch.locking import (
    LockConflictError,
    acquire_lock,
    heartbeat_lock,
    release_lock,
)
from app.services.agent_dispatch.prompt_envelope import build_prompt_envelope
from app.services.agent_dispatch.webhooks import map_webhook_to_fields, verify_cursor_webhook_signature
from app.services.token_crypto import encrypt_secret

logger = logging.getLogger(__name__)


def _allowlist_ok(settings: Settings, repo_url: str, base_branch: str) -> None:
    repos = {
        r.strip().rstrip("/")
        for r in (settings.agent_dispatch_repo_allowlist or "").split(",")
        if r.strip()
    }
    branches = {
        b.strip() for b in (settings.agent_dispatch_base_branch_allowlist or "").split(",") if b.strip()
    }
    norm = repo_url.strip().rstrip("/")
    if repos and norm not in repos and norm.replace("https://", "") not in {
        x.replace("https://", "") for x in repos
    }:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="repository not allowlisted")
    if branches and base_branch not in branches:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="base_branch not allowlisted")


def create_dispatch_run(
    db: Session,
    settings: Settings,
    principal: AgentDispatchPrincipal,
    *,
    task_name: str,
    prompt: str,
    repository_url: str,
    base_branch: str,
    execution_policy: dict[str, Any] | None = None,
    auto_create_pr: bool = False,
    branch_name: str | None = None,
    model_id: str | None = None,
    idempotency_key: str | None = None,
    metadata: dict[str, Any] | None = None,
    dispatch_now: bool = True,
) -> AgentDispatchRun:
    _allowlist_ok(settings, repository_url, base_branch)

    policy = {**DEFAULT_EXECUTION_POLICY, **(execution_policy or {})}
    for key in DEFAULT_EXECUTION_POLICY:
        if policy.get(key) is not True:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                detail=f"execution_policy.{key} must be true",
            )

    if idempotency_key:
        existing = db.execute(
            select(AgentDispatchRun).where(AgentDispatchRun.idempotency_key == idempotency_key)
        ).scalar_one_or_none()
        if existing:
            return existing

    envelope = build_prompt_envelope(prompt)
    store_encrypted = bool(settings.agent_dispatch_encrypt_prompts)
    ttl_hours = int(settings.agent_dispatch_prompt_ttl_hours or 0)

    run = AgentDispatchRun(
        id=str(uuid.uuid4()),
        status=DispatchRunStatus.QUEUED.value,
        task_name=(task_name or "").strip()[:128] or "unnamed",
        repository_url=repository_url.strip().rstrip("/"),
        base_branch=base_branch.strip(),
        requested_branch_name=branch_name,
        auto_create_pr=bool(auto_create_pr),
        execution_policy_json=json.dumps(policy, sort_keys=True),
        model_id=model_id,
        prompt_envelope_version=envelope.version,
        prompt_hash=envelope.prompt_hash,
        prompt_redacted_preview=envelope.redacted_preview,
        prompt_ciphertext=encrypt_secret(envelope.rendered_text) if store_encrypted else None,
        prompt_expires_at=(datetime.utcnow() + timedelta(hours=ttl_hours)) if ttl_hours > 0 else None,
        idempotency_key=idempotency_key,
        created_by_fingerprint=principal.token_fingerprint,
        metadata_json=json.dumps(metadata or {}, default=str),
        lease_expires_at=datetime.utcnow()
        + timedelta(seconds=int(settings.agent_dispatch_lock_lease_seconds or 120)),
    )
    db.add(run)
    db.flush()

    try:
        acquire_lock(
            db,
            repo_url=run.repository_url,
            base_branch=run.base_branch,
            run=run,
            lease_seconds=int(settings.agent_dispatch_lock_lease_seconds or 120),
            holder_fingerprint=principal.token_fingerprint,
        )
    except LockConflictError as exc:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail={
                "error": "active_run_lock",
                "lock_run_id": exc.lock.run_id,
                "repo_url": exc.lock.repo_url,
                "base_branch": exc.lock.base_branch,
            },
        ) from exc

    write_audit(
        db,
        run_id=run.id,
        event_type="run_created",
        actor_fingerprint=principal.token_fingerprint,
        detail={
            "prompt_hash": envelope.prompt_hash,
            "repository_url": run.repository_url,
            "task_name": run.task_name,
        },
    )
    db.commit()
    db.refresh(run)

    if dispatch_now:
        try:
            dispatch_to_cursor(db, settings, run.id)
        except Exception:
            logger.exception("dispatch_to_cursor failed for %s", run.id)
            db.refresh(run)
    return run


def _prompt_text_for_dispatch(run: AgentDispatchRun) -> str:
    if run.prompt_expires_at and datetime.utcnow() > run.prompt_expires_at:
        raise CursorApiError("prompt TTL expired", status_code=410)
    if run.prompt_ciphertext:
        from app.services.token_crypto import decrypt_secret

        return decrypt_secret(run.prompt_ciphertext)
    raise CursorApiError("prompt ciphertext missing; cannot dispatch", status_code=500)


def dispatch_to_cursor(db: Session, settings: Settings, run_id: str) -> AgentDispatchRun:
    run = db.get(AgentDispatchRun, run_id)
    if not run:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="run not found")
    if run.status not in (DispatchRunStatus.QUEUED.value, DispatchRunStatus.DISPATCHING.value):
        return run

    run.status = DispatchRunStatus.DISPATCHING.value
    run.updated_at = datetime.utcnow()
    db.commit()

    client = CursorCloudAgentsClient(settings)
    webhook_url = (settings.agent_dispatch_webhook_public_url or "").strip() or None
    webhook_secret = (settings.agent_dispatch_webhook_secret or "").strip() or None
    if webhook_url and not webhook_secret:
        webhook_secret = secrets.token_urlsafe(32)
        # Persist generated secret only in settings env in prod; for this run store hash.
        run.webhook_secret_fingerprint = hashlib.sha256(webhook_secret.encode()).hexdigest()[:16]

    try:
        prompt_text = _prompt_text_for_dispatch(run)
    except CursorApiError as exc:
        if exc.status_code == 410:
            run.status = DispatchRunStatus.FAILED.value
            run.error_code = "prompt_ttl_expired"
            run.error_message = "prompt ciphertext TTL expired before dispatch"
            run.finished_at = datetime.utcnow()
            run.prompt_ciphertext = None
            release_lock(db, run_id=run.id)
            db.commit()
            db.refresh(run)
            return run
        run.status = DispatchRunStatus.FAILED.value
        run.error_code = "prompt_unavailable"
        run.error_message = "encrypted prompt required for dispatch"
        run.finished_at = datetime.utcnow()
        release_lock(db, run_id=run.id)
        db.commit()
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail="prompt_unavailable") from exc

    try:
        created = client.create_agent(
            prompt_text=prompt_text,
            repository_url=run.repository_url,
            starting_ref=run.base_branch,
            auto_create_pr=bool(run.auto_create_pr),
            branch_name=run.requested_branch_name,
            model_id=run.model_id,
            webhook_url=webhook_url,
            webhook_secret=webhook_secret,
            name=f"twin-dispatch-{run.id[:8]}",
        )
    except CursorApiError as exc:
        run.status = DispatchRunStatus.FAILED.value
        run.error_code = "cursor_create_failed"
        # Include status + safe body for ops; never store raw secrets (body already redacted).
        detail_bits = [str(exc)]
        if exc.status_code is not None:
            detail_bits.append(f"status={exc.status_code}")
        if exc.body:
            detail_bits.append(exc.body[:200])
        run.error_message = " | ".join(detail_bits)[:400]
        run.finished_at = datetime.utcnow()
        release_lock(db, run_id=run.id)
        write_audit(
            db,
            run_id=run.id,
            event_type="dispatch_failed",
            actor_fingerprint=None,
            detail={"status_code": exc.status_code, "body_preview": (exc.body or "")[:200]},
        )
        db.commit()
        db.refresh(run)
        return run

    run.cursor_api_version = created.api_version
    run.cursor_agent_id = created.agent_id
    run.cursor_run_id = created.run_id
    run.cursor_agent_url = created.agent_url
    run.cursor_status = created.status
    run.status = DispatchRunStatus.RUNNING.value
    run.dispatched_at = datetime.utcnow()
    run.updated_at = datetime.utcnow()
    heartbeat_lock(db, run_id=run.id, lease_seconds=int(settings.agent_dispatch_lock_lease_seconds or 120))
    write_audit(
        db,
        run_id=run.id,
        event_type="dispatched",
        actor_fingerprint=None,
        detail={"cursor_api_version": created.api_version, "cursor_agent_id": created.agent_id},
    )
    db.commit()
    db.refresh(run)
    return run


def _map_cursor_status_to_dispatch(cursor_status: str, api_version: str) -> str | None:
    """Return a terminal / intermediate dispatcher status hint, or None to stay running."""
    cs = (cursor_status or "").upper()
    if api_version == "v1":
        if cs == CURSOR_V1_RUN_FINISHED:
            return DispatchRunStatus.AWAITING_RESULT.value
        if cs == CURSOR_V1_RUN_ERROR:
            return DispatchRunStatus.FAILED.value
        if cs == CURSOR_V1_RUN_CANCELLED:
            return DispatchRunStatus.CANCELLED.value
        if cs == CURSOR_V1_RUN_EXPIRED:
            return DispatchRunStatus.TIMED_OUT.value
        if cs in CURSOR_V1_TERMINAL:
            return DispatchRunStatus.FAILED.value
        return None
    # v0 agent statuses
    if cs == CURSOR_V0_FINISHED:
        return DispatchRunStatus.AWAITING_RESULT.value
    if cs == CURSOR_V0_ERROR:
        return DispatchRunStatus.FAILED.value
    return None


def reconcile_run(db: Session, settings: Settings, run_id: str) -> AgentDispatchRun:
    run = db.get(AgentDispatchRun, run_id)
    if not run:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="run not found")
    if run.status in DISPATCH_RUN_TERMINAL:
        return run
    if not run.cursor_agent_id:
        return run

    # Timeout check
    timeout_min = int(settings.agent_dispatch_run_timeout_minutes or 180)
    started = run.dispatched_at or run.created_at
    if started and datetime.utcnow() - started > timedelta(minutes=timeout_min):
        return _timeout_run(db, settings, run)

    client = CursorCloudAgentsClient(settings)
    try:
        snap = client.get_run_snapshot(
            api_version=run.cursor_api_version or "v1",
            agent_id=run.cursor_agent_id,
            run_id=run.cursor_run_id,
        )
    except CursorApiError as exc:
        write_audit(
            db,
            run_id=run.id,
            event_type="poll_error",
            actor_fingerprint=None,
            detail={"status_code": exc.status_code},
        )
        db.commit()
        return run

    run.cursor_status = snap.status
    run.result_branch = snap.branch_name or run.result_branch
    run.result_pr_url = snap.pr_url or run.result_pr_url
    if snap.result_text:
        run.result_summary = snap.result_text[:8000]
    run.last_polled_at = datetime.utcnow()
    heartbeat_lock(db, run_id=run.id, lease_seconds=int(settings.agent_dispatch_lock_lease_seconds or 120))

    mapped = _map_cursor_status_to_dispatch(snap.status, run.cursor_api_version or "v1")
    if mapped == DispatchRunStatus.AWAITING_RESULT.value:
        run.status = DispatchRunStatus.AWAITING_RESULT.value
        db.commit()
        return finalize_with_github(db, settings, run.id)
    if mapped in (
        DispatchRunStatus.FAILED.value,
        DispatchRunStatus.CANCELLED.value,
        DispatchRunStatus.TIMED_OUT.value,
    ):
        run.status = mapped
        run.finished_at = datetime.utcnow()
        if mapped == DispatchRunStatus.FAILED.value:
            run.error_code = run.error_code or "cursor_error"
        release_lock(db, run_id=run.id)
        write_audit(db, run_id=run.id, event_type="terminal", actor_fingerprint=None, detail={"status": mapped})
        db.commit()
        db.refresh(run)
        return run

    run.status = DispatchRunStatus.RUNNING.value
    db.commit()
    db.refresh(run)
    return run


def finalize_with_github(db: Session, settings: Settings, run_id: str) -> AgentDispatchRun:
    run = db.get(AgentDispatchRun, run_id)
    if not run:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="run not found")

    enricher = GitHubEnricher(settings)
    enrichment = enricher.enrich(
        repository_url=run.repository_url,
        branch_name=run.result_branch,
        pr_url=run.result_pr_url,
        require_pr=bool(settings.agent_dispatch_require_pr),
        require_ci=bool(settings.agent_dispatch_require_ci_success),
    )
    run.result_branch = enrichment.branch_name or run.result_branch
    run.result_pr_url = enrichment.pr_url or run.result_pr_url
    run.result_head_sha = enrichment.head_sha
    run.result_ci_status = enrichment.ci_status
    run.github_enrichment_json = json.dumps(
        {
            "ok": enrichment.ok,
            "attention_reason": enrichment.attention_reason,
            "owner": enrichment.owner,
            "repo": enrichment.repo,
            "pr_number": enrichment.pr_number,
            "ci_status": enrichment.ci_status,
        },
        default=str,
    )

    if enrichment.ok:
        run.status = DispatchRunStatus.SUCCEEDED.value
    else:
        run.status = DispatchRunStatus.NEEDS_ATTENTION.value
        run.error_code = "github_mismatch"
        run.error_message = enrichment.attention_reason

    run.finished_at = datetime.utcnow()
    release_lock(db, run_id=run.id)
    write_audit(
        db,
        run_id=run.id,
        event_type="finalized",
        actor_fingerprint=None,
        detail={"status": run.status, "sha": enrichment.head_sha, "ci": enrichment.ci_status},
    )
    # Drop ciphertext after success path when TTL policy says so.
    if run.prompt_ciphertext and settings.agent_dispatch_drop_prompt_on_terminal:
        run.prompt_ciphertext = None
    db.commit()
    db.refresh(run)
    return run


def _timeout_run(db: Session, settings: Settings, run: AgentDispatchRun) -> AgentDispatchRun:
    # Best-effort cancel at Cursor.
    if run.cursor_agent_id:
        try:
            CursorCloudAgentsClient(settings).cancel(
                api_version=run.cursor_api_version or "v1",
                agent_id=run.cursor_agent_id,
                run_id=run.cursor_run_id,
            )
        except CursorApiError:
            logger.warning("timeout cancel failed for %s", run.id)
    run.status = DispatchRunStatus.TIMED_OUT.value
    run.error_code = "timed_out"
    run.finished_at = datetime.utcnow()
    release_lock(db, run_id=run.id)
    write_audit(db, run_id=run.id, event_type="timed_out", actor_fingerprint=None, detail={})
    db.commit()
    db.refresh(run)
    return run


def cancel_run(
    db: Session,
    settings: Settings,
    principal: AgentDispatchPrincipal,
    run_id: str,
) -> AgentDispatchRun:
    run = db.get(AgentDispatchRun, run_id)
    if not run:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="run not found")
    if run.status in DISPATCH_RUN_TERMINAL:
        return run

    run.status = DispatchRunStatus.CANCELLING.value
    db.commit()

    if run.cursor_agent_id:
        try:
            CursorCloudAgentsClient(settings).cancel(
                api_version=run.cursor_api_version or "v1",
                agent_id=run.cursor_agent_id,
                run_id=run.cursor_run_id,
            )
        except CursorApiError as exc:
            write_audit(
                db,
                run_id=run.id,
                event_type="cancel_cursor_error",
                actor_fingerprint=principal.token_fingerprint,
                detail={"status_code": exc.status_code},
            )

    run.status = DispatchRunStatus.CANCELLED.value
    run.finished_at = datetime.utcnow()
    release_lock(db, run_id=run.id)
    write_audit(
        db,
        run_id=run.id,
        event_type="cancelled",
        actor_fingerprint=principal.token_fingerprint,
        detail={},
    )
    db.commit()
    db.refresh(run)
    return run


def admin_force_unlock(
    db: Session,
    principal: AgentDispatchPrincipal,
    *,
    repo_url: str,
    base_branch: str,
) -> dict[str, Any]:
    """Removed from public API — kept to fail closed if called internally."""
    raise HTTPException(
        status.HTTP_403_FORBIDDEN,
        detail={
            "error": "no_admin_override",
            "message": "Force-unlock is disabled under execution_policy.no_admin_override",
            "repository_url": repo_url,
            "base_branch": base_branch,
            "actor": principal.token_fingerprint,
        },
    )


def purge_expired_prompts(db: Session) -> int:
    """Drop ciphertext for expired prompts (TTL) on non-dispatched or any row past TTL."""
    now = datetime.utcnow()
    rows = (
        db.execute(
            select(AgentDispatchRun).where(
                AgentDispatchRun.prompt_ciphertext.isnot(None),
                AgentDispatchRun.prompt_expires_at.isnot(None),
                AgentDispatchRun.prompt_expires_at < now,
            )
        )
        .scalars()
        .all()
    )
    n = 0
    for run in rows:
        run.prompt_ciphertext = None
        n += 1
    if n:
        db.commit()
    return n


def ingest_webhook(
    db: Session,
    settings: Settings,
    *,
    raw_body: bytes,
    signature: str | None,
    webhook_id: str | None,
    event_name: str | None,
    payload: dict[str, Any],
) -> dict[str, str]:
    secret = (settings.agent_dispatch_webhook_secret or "").strip()
    if not secret:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, detail="webhook secret not configured")
    if not verify_cursor_webhook_signature(secret=secret, raw_body=raw_body, signature=signature):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="invalid webhook signature")

    delivery_id = (webhook_id or "").strip() or hashlib.sha256(raw_body).hexdigest()
    existing = db.execute(
        select(AgentDispatchWebhookEvent).where(AgentDispatchWebhookEvent.delivery_id == delivery_id)
    ).scalar_one_or_none()
    if existing:
        return {"status": "duplicate"}

    fields = map_webhook_to_fields(payload)
    agent_id = fields.get("cursor_agent_id")
    run = None
    if agent_id:
        run = db.execute(
            select(AgentDispatchRun).where(AgentDispatchRun.cursor_agent_id == agent_id)
        ).scalar_one_or_none()

    row = AgentDispatchWebhookEvent(
        delivery_id=delivery_id,
        event_name=event_name or fields.get("event") or "statusChange",
        cursor_agent_id=agent_id,
        run_id=run.id if run else None,
        payload_json=json.dumps(fields, default=str),
        received_at=datetime.utcnow(),
    )
    db.add(row)
    db.flush()

    if run and run.status not in DISPATCH_RUN_TERMINAL:
        run.cursor_status = fields.get("cursor_status")
        if fields.get("branch_name"):
            run.result_branch = fields["branch_name"]
        if fields.get("pr_url"):
            run.result_pr_url = fields["pr_url"]
        if fields.get("summary"):
            run.result_summary = str(fields["summary"])[:8000]
        if fields.get("agent_url"):
            run.cursor_agent_url = fields["agent_url"]
        cs = (fields.get("cursor_status") or "").upper()
        if cs == CURSOR_V0_FINISHED:
            run.status = DispatchRunStatus.AWAITING_RESULT.value
            db.commit()
            finalize_with_github(db, settings, run.id)
            return {"status": "processed"}
        if cs == CURSOR_V0_ERROR:
            run.status = DispatchRunStatus.FAILED.value
            run.error_code = "cursor_webhook_error"
            run.finished_at = datetime.utcnow()
            release_lock(db, run_id=run.id)
    db.commit()
    return {"status": "processed"}


def recover_active_runs(db: Session, settings: Settings) -> dict[str, int]:
    """On worker restart: re-queue polling for non-terminal locked runs."""
    rows = (
        db.execute(select(AgentDispatchRun).where(AgentDispatchRun.status.in_(list(ACTIVE_LOCK_STATUSES))))
        .scalars()
        .all()
    )
    count = 0
    for run in rows:
        try:
            reconcile_run(db, settings, run.id)
            count += 1
        except Exception:
            logger.exception("recover failed for %s", run.id)
    return {"reconciled": count}


def list_dispatch_runs(
    db: Session,
    *,
    limit: int = 20,
    status: str | None = None,
) -> list[AgentDispatchRun]:
    """Newest-first listing for MCP / CLI."""
    lim = max(1, min(int(limit or 20), 100))
    stmt = select(AgentDispatchRun).order_by(AgentDispatchRun.created_at.desc()).limit(lim)
    if status:
        stmt = (
            select(AgentDispatchRun)
            .where(AgentDispatchRun.status == status.strip())
            .order_by(AgentDispatchRun.created_at.desc())
            .limit(lim)
        )
    return list(db.execute(stmt).scalars().all())


def run_report_dict(db: Session, run_id: str) -> dict[str, Any]:
    run = db.get(AgentDispatchRun, run_id)
    if not run:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="run not found")
    data = run_to_public_dict(run)
    data["report"] = {
        "status": run.status,
        "branch": run.result_branch,
        "pr_url": run.result_pr_url,
        "head_sha": run.result_head_sha,
        "ci_status": run.result_ci_status,
        "summary": run.result_summary,
        "error_code": run.error_code,
        "error_message": run.error_message,
    }
    return data


def get_run_handoff(db: Session, run_id: str) -> dict[str, Any]:
    """Structured handoff for ChatGPT/MCP — no manual prompt copy required."""
    report = run_report_dict(db, run_id)
    run = db.get(AgentDispatchRun, run_id)
    assert run is not None
    return {
        "handoff_version": "twin-agent-dispatch-handoff/v1",
        "run_id": run.id,
        "task_name": run.task_name,
        "status": run.status,
        "repository_url": run.repository_url,
        "base_branch": run.base_branch,
        "result": {
            "branch": run.result_branch,
            "pr_url": run.result_pr_url,
            "head_sha": run.result_head_sha,
            "ci_status": run.result_ci_status,
            "summary": run.result_summary,
        },
        "cursor": {
            "api_version": run.cursor_api_version,
            "agent_id": run.cursor_agent_id,
            "run_id": run.cursor_run_id,
            "status": run.cursor_status,
            "agent_url": run.cursor_agent_url,
        },
        "errors": {
            "code": run.error_code,
            "message": run.error_message,
        },
        "report": report.get("report"),
        "public_run": {k: v for k, v in report.items() if k != "report"},
        "next_steps": [
            "Review PR manually — Dispatcher never merges.",
            "Retrieve this handoff via get_twin_agent_handoff / GET .../handoff.",
            "Do not copy prompts from chat; use run_id only.",
        ],
    }


def run_to_public_dict(run: AgentDispatchRun) -> dict[str, Any]:
    enrichment = None
    if run.github_enrichment_json:
        try:
            enrichment = json.loads(run.github_enrichment_json)
        except json.JSONDecodeError:
            enrichment = None
    policy = None
    if run.execution_policy_json:
        try:
            policy = json.loads(run.execution_policy_json)
        except json.JSONDecodeError:
            policy = None
    return {
        "id": run.id,
        "status": run.status,
        "task_name": run.task_name,
        "repository_url": run.repository_url,
        "repository": run.repository_url,
        "base_branch": run.base_branch,
        "execution_policy": policy or dict(DEFAULT_EXECUTION_POLICY),
        "auto_create_pr": bool(run.auto_create_pr),
        "prompt_hash": run.prompt_hash,
        "prompt_preview": run.prompt_redacted_preview,
        "cursor_api_version": run.cursor_api_version,
        "cursor_agent_id": run.cursor_agent_id,
        "cursor_run_id": run.cursor_run_id,
        "cursor_status": run.cursor_status,
        "cursor_agent_url": run.cursor_agent_url,
        "result_branch": run.result_branch,
        "result_pr_url": run.result_pr_url,
        "result_head_sha": run.result_head_sha,
        "result_ci_status": run.result_ci_status,
        "result_summary": run.result_summary,
        "error_code": run.error_code,
        "error_message": run.error_message,
        "idempotency_key": run.idempotency_key,
        "created_at": run.created_at.isoformat() + "Z" if run.created_at else None,
        "dispatched_at": run.dispatched_at.isoformat() + "Z" if run.dispatched_at else None,
        "finished_at": run.finished_at.isoformat() + "Z" if run.finished_at else None,
        "github_enrichment": enrichment,
    }
