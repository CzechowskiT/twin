"""Persistent single-active-run lock (repo_url + base_branch)."""

from __future__ import annotations

from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database.models import AgentDispatchLock, AgentDispatchRun
from app.services.agent_dispatch.constants import ACTIVE_LOCK_STATUSES


class LockConflictError(Exception):
    def __init__(self, lock: AgentDispatchLock):
        self.lock = lock
        super().__init__(f"Active lock held by run {lock.run_id}")


def acquire_lock(
    db: Session,
    *,
    repo_url: str,
    base_branch: str,
    run: AgentDispatchRun,
    lease_seconds: int,
    holder_fingerprint: str,
) -> AgentDispatchLock:
    """Atomically claim (repo, base_branch). Raises LockConflictError on conflict."""
    now = datetime.utcnow()
    # Expire stale leases first.
    stale = (
        db.execute(
            select(AgentDispatchLock).where(
                AgentDispatchLock.repo_url == repo_url,
                AgentDispatchLock.base_branch == base_branch,
                AgentDispatchLock.lease_expires_at < now,
            )
        )
        .scalars()
        .all()
    )
    for row in stale:
        db.delete(row)
    db.flush()

    existing = db.execute(
        select(AgentDispatchLock).where(
            AgentDispatchLock.repo_url == repo_url,
            AgentDispatchLock.base_branch == base_branch,
        )
    ).scalar_one_or_none()
    if existing:
        holder = db.get(AgentDispatchRun, existing.run_id)
        if holder and holder.status in ACTIVE_LOCK_STATUSES and existing.lease_expires_at >= now:
            raise LockConflictError(existing)
        db.delete(existing)
        db.flush()

    lock = AgentDispatchLock(
        repo_url=repo_url,
        base_branch=base_branch,
        run_id=run.id,
        holder_fingerprint=holder_fingerprint,
        lease_expires_at=now + timedelta(seconds=lease_seconds),
        created_at=now,
        updated_at=now,
    )
    db.add(lock)
    try:
        db.flush()
    except IntegrityError as exc:
        db.expire_all()
        existing = db.execute(
            select(AgentDispatchLock).where(
                AgentDispatchLock.repo_url == repo_url,
                AgentDispatchLock.base_branch == base_branch,
            )
        ).scalar_one_or_none()
        if existing:
            raise LockConflictError(existing) from exc
        raise
    return lock


def heartbeat_lock(db: Session, *, run_id: str, lease_seconds: int) -> bool:
    lock = db.execute(select(AgentDispatchLock).where(AgentDispatchLock.run_id == run_id)).scalar_one_or_none()
    if not lock:
        return False
    lock.lease_expires_at = datetime.utcnow() + timedelta(seconds=lease_seconds)
    lock.updated_at = datetime.utcnow()
    db.flush()
    return True


def release_lock(db: Session, *, run_id: str) -> None:
    lock = db.execute(select(AgentDispatchLock).where(AgentDispatchLock.run_id == run_id)).scalar_one_or_none()
    if lock:
        db.delete(lock)
        db.flush()


def force_unlock(
    db: Session,
    *,
    repo_url: str,
    base_branch: str,
) -> AgentDispatchLock | None:
    lock = db.execute(
        select(AgentDispatchLock).where(
            AgentDispatchLock.repo_url == repo_url,
            AgentDispatchLock.base_branch == base_branch,
        )
    ).scalar_one_or_none()
    if not lock:
        return None
    db.delete(lock)
    db.flush()
    return lock
