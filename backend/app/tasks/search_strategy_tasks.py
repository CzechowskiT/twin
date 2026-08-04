"""Celery refresh for search strategy lab — internal only, no silent activation."""

from __future__ import annotations

import logging

from app.database.session import SessionLocal
from app.services import search_strategy_lab as lab
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.search_strategy_tasks.refresh_coverage")
def refresh_coverage(candidate_id: int) -> dict:
    db = SessionLocal()
    try:
        out = lab.build_source_coverage(db, candidate_id=int(candidate_id))
        return {
            "ok": True,
            "whole_market_claim": False,
            "silent_activation": False,
            "result": out,
        }
    except Exception as exc:
        logger.exception("search strategy coverage refresh failed: %s", exc)
        return {"ok": False, "silent": False, "error": type(exc).__name__}
    finally:
        db.close()


@celery_app.task(name="app.tasks.search_strategy_tasks.refresh_portfolio_health")
def refresh_portfolio_health(candidate_id: int, strategy_id: int) -> dict:
    db = SessionLocal()
    try:
        out = lab.refresh_portfolio(
            db, candidate_id=int(candidate_id), strategy_id=int(strategy_id)
        )
        return {
            "ok": True,
            "fabricated_conversion": False,
            "silent_weight_change": False,
            "result": out,
        }
    except Exception as exc:
        logger.exception("search strategy portfolio refresh failed: %s", exc)
        return {"ok": False, "silent": False, "error": type(exc).__name__}
    finally:
        db.close()
