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
    AgentDispatchLock,
    AgentDispatchRun,
    AgentDispatchWebhookEvent,
)
from app.services.agent_dispatch.audit import write_audit
from app.services.agent_dispatch.artifacts import (
    artifact_outcome,
    execution_contract_hash,
    has_mutation_requirement,
    infer_expected_artifacts,
    missing_reason,
    normalize_expected,
    normalize_verified,
    resolve_execution_contract,
)
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
    OPERATOR_RUN_STATUSES,
    DispatchRunStatus,
)
from app.services.agent_dispatch.cursor_client import (
    CursorApiError,
    CursorCloudAgentsClient,
)
from app.services.agent_dispatch.github_enricher import GitHubEnricher, GitHubEnrichment
from app.services.agent_dispatch.locking import (
    LockConflictError,
    acquire_lock,
    heartbeat_lock,
    release_lock,
)
from app.services.agent_dispatch.prompt_envelope import build_prompt_envelope
from app.services.agent_dispatch.webhooks import map_webhook_to_fields, verify_cursor_webhook_signature
from app.services.token_crypto import decrypt_secret, encrypt_secret

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


def _misclassified_read_only_holder(run: AgentDispatchRun) -> bool:
    expected = _expected_for_run(run)
    if not expected["read_only"] or not run.prompt_ciphertext:
        return False
    try:
        rendered = decrypt_secret(run.prompt_ciphertext)
        if hashlib.sha256(rendered.encode()).hexdigest() != run.prompt_hash:
            return False
        return has_mutation_requirement(rendered)
    except Exception:
        logger.warning("Could not inspect execution contract for lock holder %s", run.id)
        return False


def _recover_invalid_read_only_holder(
    db: Session,
    *,
    repository_url: str,
    base_branch: str,
    actor_fingerprint: str,
) -> None:
    """Terminalize only a provably misclassified read-only lock holder."""
    lock = db.execute(
        select(AgentDispatchLock)
        .where(
            AgentDispatchLock.repo_url == repository_url.strip().rstrip("/"),
            AgentDispatchLock.base_branch == base_branch.strip(),
        )
        .with_for_update()
    ).scalar_one_or_none()
    holder = db.get(AgentDispatchRun, lock.run_id) if lock else None
    if not holder or holder.status not in ACTIVE_LOCK_STATUSES:
        return
    if not _misclassified_read_only_holder(holder):
        return
    if holder.cursor_agent_id:
        return
    holder.status = DispatchRunStatus.FAILED.value
    holder.error_code = "invalid_execution_contract"
    holder.error_message = "Superseded after deterministic execution-contract validation"
    holder.finished_at = holder.updated_at = datetime.utcnow()
    write_audit(
        db,
        run_id=holder.id,
        event_type="invalid_execution_contract_terminalized",
        actor_fingerprint=actor_fingerprint,
        detail={"lock_id": lock.id if lock else None, "replacement_mode": "mutating"},
    )
    release_lock(db, run_id=holder.id)
    write_audit(
        db,
        run_id=holder.id,
        event_type="orphaned_lock_released",
        actor_fingerprint=actor_fingerprint,
        detail={"lock_id": lock.id if lock else None, "reason": "misclassified_read_only"},
    )


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
    execution_contract: dict[str, Any] | None = None,
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

    explicit_contract = dict(execution_contract or {})
    if settings.agent_dispatch_require_pr:
        explicit_contract["pr_required"] = True
    if settings.agent_dispatch_require_ci_success:
        explicit_contract["commit_required"] = True
    try:
        expected_artifacts = resolve_execution_contract(
            prompt,
            explicit=explicit_contract,
            auto_create_pr=auto_create_pr,
        )
    except ValueError as exc:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail={"error": "invalid_execution_contract"},
        ) from exc
    expected_artifacts["ci_required"] |= bool(settings.agent_dispatch_require_ci_success)
    contract_hash = execution_contract_hash(expected_artifacts)
    envelope = build_prompt_envelope(prompt, expected_artifacts=expected_artifacts)

    if idempotency_key:
        existing = db.execute(
            select(AgentDispatchRun).where(AgentDispatchRun.idempotency_key == idempotency_key)
        ).scalar_one_or_none()
        if existing:
            existing_hash = existing.execution_contract_hash or execution_contract_hash(
                _expected_for_run(existing)
            )
            if existing_hash != contract_hash:
                raise HTTPException(
                    status.HTTP_409_CONFLICT,
                    detail={"error": "idempotency_execution_contract_mismatch"},
                )
            same_request = (
                existing.repository_url == repository_url.strip().rstrip("/")
                and existing.base_branch == base_branch.strip()
                and existing.prompt_hash == envelope.prompt_hash
                and existing.created_by_fingerprint == principal.token_fingerprint
            )
            if not same_request:
                raise HTTPException(
                    status.HTTP_409_CONFLICT,
                    detail={"error": "idempotency_request_mismatch"},
                )
            return existing

    if expected_artifacts["execution_mode"] == "mutating":
        _recover_invalid_read_only_holder(
            db,
            repository_url=repository_url,
            base_branch=base_branch,
            actor_fingerprint=principal.token_fingerprint,
        )
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
        expected_artifacts_json=json.dumps(expected_artifacts, sort_keys=True),
        verified_artifacts_json=json.dumps(normalize_verified(None), sort_keys=True),
        execution_mode=expected_artifacts["execution_mode"],
        read_only=expected_artifacts["read_only"],
        mutation_required=expected_artifacts["mutation_required"],
        operator_execution_required=expected_artifacts["operator_execution_required"],
        execution_contract_hash=contract_hash,
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
    if run.status in OPERATOR_RUN_STATUSES:
        return run
    if run.status in DISPATCH_RUN_TERMINAL and run.status != DispatchRunStatus.NEEDS_ATTENTION.value:
        return run
    if run.status == DispatchRunStatus.NEEDS_ATTENTION.value:
        return finalize_with_github(db, settings, run.id)
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
        if run.status == DispatchRunStatus.AWAITING_RESULT.value:
            run.status = DispatchRunStatus.NEEDS_ATTENTION.value
            run.error_code = "reconcile_failed"
            run.error_message = "Cursor state refresh failed before artifact verification"
            run.finished_at = datetime.utcnow()
            release_lock(db, run_id=run.id)
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


def _expected_for_run(run: AgentDispatchRun) -> dict[str, Any]:
    try:
        raw = json.loads(run.expected_artifacts_json or "{}")
    except json.JSONDecodeError:
        raw = {}
    if run.execution_mode and "execution_mode" not in raw:
        raw["execution_mode"] = run.execution_mode
    for key in ("read_only", "mutation_required", "operator_execution_required"):
        value = getattr(run, key, None)
        if value is not None and key not in raw:
            raw[key] = value
    return normalize_expected(raw)


def _expected_contract_present(run: AgentDispatchRun) -> bool:
    try:
        raw = json.loads(run.expected_artifacts_json or "{}")
    except json.JSONDecodeError:
        return False
    if not isinstance(raw, dict):
        return False
    required = set(normalize_expected(None))
    for key in required:
        if key not in raw:
            return False
        value = raw[key]
        if key == "execution_mode":
            if value not in {"read_only", "mutating"}:
                return False
            continue
        if not isinstance(value, bool):
            return False
    return True


def _refresh_cursor_artifacts(
    run: AgentDispatchRun,
    settings: Settings,
) -> bool:
    if not run.cursor_agent_id:
        return True
    try:
        snapshot = CursorCloudAgentsClient(settings).get_run_snapshot(
            api_version=run.cursor_api_version or "v1",
            agent_id=run.cursor_agent_id,
            run_id=run.cursor_run_id,
        )
    except CursorApiError:
        return False
    run.cursor_status = snapshot.status
    run.result_branch = snapshot.branch_name or run.result_branch
    run.result_pr_url = snapshot.pr_url or run.result_pr_url
    if snapshot.result_text:
        run.result_summary = snapshot.result_text[:8000]
    run.last_polled_at = datetime.utcnow()
    return True


def _github_enrichment(
    run: AgentDispatchRun,
    settings: Settings,
    expected: dict[str, Any],
) -> GitHubEnrichment:
    return GitHubEnricher(settings).enrich(
        repository_url=run.repository_url,
        branch_name=run.result_branch,
        pr_url=run.result_pr_url,
        expected_artifacts=expected,
        expected_base_branch=run.base_branch,
    )


def _persist_enrichment(run: AgentDispatchRun, enrichment: GitHubEnrichment) -> None:
    run.result_branch = enrichment.branch_name or run.result_branch
    run.result_pr_url = enrichment.pr_url or run.result_pr_url
    run.result_head_sha = enrichment.head_sha
    run.result_ci_status = enrichment.ci_status
    run.verified_artifacts_json = json.dumps(enrichment.verified_artifacts, sort_keys=True)
    run.github_enrichment_json = json.dumps(
        {
            "ok": enrichment.ok,
            "attention_reason": enrichment.attention_reason,
            "owner": enrichment.owner,
            "repo": enrichment.repo,
            "pr_number": enrichment.pr_number,
            "head_sha": enrichment.head_sha,
            "merge_sha": enrichment.merge_sha,
            "deployment_sha": enrichment.deployment_sha,
            "deployment_ids": list(enrichment.deployment_ids),
            "deployment_environments": enrichment.raw.get("deployment_environments", {}),
            "ci_status": enrichment.ci_status,
            "regression_status": enrichment.regression_status,
            "regression_check_names": enrichment.raw.get("regression_check_names", []),
            "merge_actor": enrichment.raw.get("merge_actor"),
            "merged_at": enrichment.raw.get("merged_at"),
            "verified_artifacts": enrichment.verified_artifacts,
            "verification_error": enrichment.verification_error,
        },
        default=str,
    )


def _set_artifact_status(
    run: AgentDispatchRun,
    expected: dict[str, Any],
    enrichment: GitHubEnrichment,
    reconcile_ok: bool,
) -> None:
    outcome, reason = artifact_outcome(
        expected,
        enrichment.verified_artifacts,
        reconcile_ok=reconcile_ok,
        verification_error=enrichment.verification_error,
    )
    run.status = outcome
    run.error_code = reason
    run.error_message = _reason_message(reason)


def _reason_message(reason: str | None) -> str | None:
    messages = {
        "expected_pr_missing": "Required pull request was not verified after reconciliation.",
        "expected_commit_missing": "Required commit and head SHA were not verified.",
        "expected_ci_missing": "Required CI checks did not reach a verified passing state.",
        "expected_merge_missing": "Required manual merge was not verified.",
        "expected_deployment_missing": "Required production deployments were not verified.",
        "expected_regression_missing": "Required production regression did not pass.",
        "reconcile_failed": "Artifact reconciliation failed; success is not permitted.",
    }
    return messages.get(reason, reason)


def finalize_with_github(db: Session, settings: Settings, run_id: str) -> AgentDispatchRun:
    run = db.get(AgentDispatchRun, run_id)
    if not run:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="run not found")
    expected = _expected_for_run(run)
    enrichment = _github_enrichment(run, settings, expected)
    reason = missing_reason(expected, enrichment.verified_artifacts)
    reconcile_ok = _expected_contract_present(run)
    if reason or enrichment.verification_error:
        refresh_ok = _refresh_cursor_artifacts(run, settings)
        reconcile_ok = reconcile_ok and refresh_ok
        cursor_active = run.cursor_agent_id and (run.cursor_status or "").upper() in {
            "CREATING",
            "RUNNING",
        }
        if refresh_ok and reconcile_ok and cursor_active:
            run.status = DispatchRunStatus.AWAITING_RESULT.value
            db.commit()
            db.refresh(run)
            return run
        if run.cursor_agent_id and (run.cursor_status or "").upper() != "FINISHED":
            reconcile_ok = False
        if reconcile_ok:
            enrichment = _github_enrichment(run, settings, expected)
    _persist_enrichment(run, enrichment)
    if _operator_handoff_ready(settings, expected, enrichment):
        from app.services.agent_dispatch.operator_github import OperatorGitHubError
        from app.services.agent_dispatch.operator_service import OperatorService

        try:
            db.commit()
            return OperatorService(db, settings).handoff(run.id)
        except OperatorGitHubError as exc:
            run.status = DispatchRunStatus.NEEDS_ATTENTION.value
            run.error_code = exc.reason_code
            run.error_message = exc.reason_code
            run.finished_at = datetime.utcnow()
            release_lock(db, run_id=run.id)
            write_audit(
                db,
                run_id=run.id,
                event_type="operator_handoff_failed",
                actor_fingerprint=None,
                detail={"reason_code": exc.reason_code},
            )
            db.commit()
            db.refresh(run)
            return run
    _set_artifact_status(run, expected, enrichment, reconcile_ok)
    run.finished_at = datetime.utcnow()
    release_lock(db, run_id=run.id)
    write_audit(
        db,
        run_id=run.id,
        event_type="finalized",
        actor_fingerprint=None,
        detail={
            "status": run.status,
            "sha": enrichment.head_sha,
            "ci": enrichment.ci_status,
            "reason_code": run.error_code,
        },
    )
    # Drop ciphertext after success path when TTL policy says so.
    if run.prompt_ciphertext and settings.agent_dispatch_drop_prompt_on_terminal:
        run.prompt_ciphertext = None
    db.commit()
    db.refresh(run)
    return run


def _operator_handoff_ready(
    settings: Settings,
    expected: dict[str, Any],
    enrichment: GitHubEnrichment,
) -> bool:
    """Require explicit operator enablement plus verified PR and CI before handoff."""
    verified = enrichment.verified_artifacts
    return bool(
        settings.agent_dispatch_operator_enabled
        and expected["operator_execution_required"]
        and expected["merge_required"]
        and not expected["read_only"]
        and verified.get("pr_exists")
        and verified.get("ci_passed")
        and not verified.get("merge_verified")
        and not enrichment.verification_error
    )


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
    run = db.execute(
        select(AgentDispatchRun)
        .where(AgentDispatchRun.id == run_id)
        .with_for_update()
    ).scalar_one_or_none()
    if not run:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="run not found")
    if run.status in DISPATCH_RUN_TERMINAL:
        return run
    if run.status in OPERATOR_RUN_STATUSES - {
        DispatchRunStatus.WAITING_FOR_OPERATOR.value
    }:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail={"error": "operator_in_progress"},
        )

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
            select(AgentDispatchRun)
            .where(AgentDispatchRun.cursor_agent_id == agent_id)
            .with_for_update()
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

    if (
        run
        and run.status not in DISPATCH_RUN_TERMINAL
        and run.status not in OPERATOR_RUN_STATUSES
    ):
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
    expected = _expected_for_run(run)
    verified = _verified_for_run(run)
    branch, pr_url, head_sha = _visible_git_result(run, expected)
    evidence = _artifact_evidence(run)
    if expected["read_only"]:
        evidence = _empty_artifact_evidence()
    data["report"] = {
        "status": run.status,
        "final_status": run.status,
        "branch": branch,
        "pr": pr_url,
        "pr_url": pr_url,
        "head_sha": head_sha,
        "merge_sha": evidence["merge_sha"],
        "deployment_sha": evidence["deployment_sha"],
        "deployment_id": evidence["deployment_id"],
        "deployment_ids": evidence["deployment_ids"],
        "deployment_environments": evidence["deployment_environments"],
        "ci_status": run.result_ci_status,
        "regression_status": evidence["regression_status"],
        "regression_check_names": evidence["regression_check_names"],
        "merge_actor": evidence["merge_actor"],
        "merged_at": evidence["merged_at"],
        "summary": run.result_summary,
        "error_code": run.error_code,
        "reason_code": run.error_code,
        "error_message": run.error_message,
        "expected_artifacts": expected,
        "verified_artifacts": verified,
    }
    return data


def get_run_handoff(db: Session, run_id: str) -> dict[str, Any]:
    """Structured handoff for ChatGPT/MCP — no manual prompt copy required."""
    report = run_report_dict(db, run_id)
    run = db.get(AgentDispatchRun, run_id)
    assert run is not None
    expected = _expected_for_run(run)
    verified = _verified_for_run(run)
    branch, pr_url, head_sha = _visible_git_result(run, expected)
    return {
        "handoff_version": "twin-agent-dispatch-handoff/v2",
        "run_id": run.id,
        "task_name": run.task_name,
        "status": run.status,
        "final_status": run.status,
        "repository_url": run.repository_url,
        "base_branch": run.base_branch,
        "expected_artifacts": expected,
        "verified_artifacts": verified,
        "result": {
            "branch": branch,
            "pr": pr_url,
            "pr_url": pr_url,
            "head_sha": head_sha,
            "merge_sha": report["report"]["merge_sha"],
            "deployment_sha": report["report"]["deployment_sha"],
            "deployment_id": report["report"]["deployment_id"],
            "deployment_ids": report["report"]["deployment_ids"],
            "deployment_environments": report["report"]["deployment_environments"],
            "ci_status": run.result_ci_status,
            "regression_status": report["report"]["regression_status"],
            "regression_check_names": report["report"]["regression_check_names"],
            "merge_actor": report["report"]["merge_actor"],
            "merged_at": report["report"]["merged_at"],
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
            "reason_code": run.error_code,
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


def _verified_for_run(run: AgentDispatchRun) -> dict[str, bool]:
    try:
        raw = json.loads(run.verified_artifacts_json or "{}")
    except json.JSONDecodeError:
        raw = {}
    return normalize_verified(raw)


def _artifact_evidence(run: AgentDispatchRun) -> dict[str, Any]:
    try:
        raw = json.loads(run.github_enrichment_json or "{}")
    except json.JSONDecodeError:
        raw = {}
    deployment_ids = raw.get("deployment_ids") or []
    return {
        "merge_sha": raw.get("merge_sha"),
        "deployment_sha": raw.get("deployment_sha"),
        "deployment_ids": deployment_ids,
        "deployment_id": deployment_ids[0] if deployment_ids else None,
        "deployment_environments": raw.get("deployment_environments") or {},
        "regression_status": raw.get("regression_status"),
        "regression_check_names": raw.get("regression_check_names") or [],
        "merge_actor": raw.get("merge_actor"),
        "merged_at": raw.get("merged_at"),
    }


def _empty_artifact_evidence() -> dict[str, Any]:
    return {
        "merge_sha": None,
        "deployment_sha": None,
        "deployment_ids": [],
        "deployment_id": None,
        "deployment_environments": {},
        "regression_status": None,
        "regression_check_names": [],
        "merge_actor": None,
        "merged_at": None,
    }


def _visible_git_result(
    run: AgentDispatchRun,
    expected: dict[str, Any],
) -> tuple[str | None, str | None, str | None]:
    if expected["read_only"]:
        return None, None, None
    return run.result_branch, run.result_pr_url, run.result_head_sha


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
    expected = _expected_for_run(run)
    verified = _verified_for_run(run)
    evidence = _artifact_evidence(run)
    if expected["read_only"]:
        enrichment = None
        evidence = _empty_artifact_evidence()
    branch, pr_url, head_sha = _visible_git_result(run, expected)
    return {
        "id": run.id,
        "status": run.status,
        "final_status": run.status,
        "task_name": run.task_name,
        "repository_url": run.repository_url,
        "repository": run.repository_url,
        "base_branch": run.base_branch,
        "execution_policy": policy or dict(DEFAULT_EXECUTION_POLICY),
        "execution_mode": expected["execution_mode"],
        "read_only": expected["read_only"],
        "mutation_required": expected["mutation_required"],
        "operator_execution_required": expected["operator_execution_required"],
        "auto_create_pr": bool(run.auto_create_pr),
        "prompt_hash": run.prompt_hash,
        "prompt_preview": run.prompt_redacted_preview,
        "cursor_api_version": run.cursor_api_version,
        "cursor_agent_id": run.cursor_agent_id,
        "cursor_run_id": run.cursor_run_id,
        "cursor_status": run.cursor_status,
        "cursor_agent_url": run.cursor_agent_url,
        "result_branch": branch,
        "result_pr_url": pr_url,
        "result_head_sha": head_sha,
        "result_merge_sha": evidence["merge_sha"],
        "result_deployment_sha": evidence["deployment_sha"],
        "result_deployment_ids": evidence["deployment_ids"],
        "result_ci_status": run.result_ci_status,
        "result_regression_status": evidence["regression_status"],
        "result_summary": run.result_summary,
        "error_code": run.error_code,
        "reason_code": run.error_code,
        "error_message": run.error_message,
        "idempotency_key": run.idempotency_key,
        "created_at": run.created_at.isoformat() + "Z" if run.created_at else None,
        "dispatched_at": run.dispatched_at.isoformat() + "Z" if run.dispatched_at else None,
        "finished_at": run.finished_at.isoformat() + "Z" if run.finished_at else None,
        "github_enrichment": enrichment,
        "expected_artifacts": expected,
        "verified_artifacts": verified,
    }
