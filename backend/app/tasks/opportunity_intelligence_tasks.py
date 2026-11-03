"""Celery refresh for opportunity intelligence — internal only, idempotent."""

from __future__ import annotations

import logging

from app.database.session import SessionLocal
from app.services import opportunity_intelligence as oi
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.opportunity_intelligence_tasks.refresh_candidate_discovery")
def refresh_candidate_discovery(candidate_id: int, idempotency_key: str | None = None) -> dict:
    db = SessionLocal()
    try:
        out = oi.run_refresh(
            db, candidate_id=int(candidate_id), idempotency_key=idempotency_key
        )
        return {"ok": True, "external_apply": False, "result": out}
    except Exception as exc:
        logger.exception("opportunity refresh failed: %s", exc)
        return {"ok": False, "silent": False, "error": type(exc).__name__}
    finally:
        db.close()


@celery_app.task(name="app.tasks.opportunity_intelligence_tasks.build_market_signals")
def build_market_signals_task() -> dict:
    db = SessionLocal()
    try:
        return {"ok": True, "market": oi.build_market_signals(db), "fabricated": False}
    finally:
        db.close()
