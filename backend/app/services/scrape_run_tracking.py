"""Redis-backed scrape run history (no DB migration)."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.services.cache_service import get_cache_service

LATEST_KEY = "twin:scrape_run:latest"
HISTORY_KEY = "twin:scrape_run:history"
HISTORY_MAX = 14
TTL_SEC = 86400 * 30


def _now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def start_run(*, run_kind: str, board_ids: list[str]) -> dict[str, Any]:
    """Mark a scheduled scrape batch as started."""
    payload: dict[str, Any] = {
        "run_kind": run_kind,
        "status": "running",
        "started_at": _now_iso(),
        "finished_at": None,
        "board_ids": board_ids,
        "sources": {},
        "warnings": [],
        "active_validated_after": None,
    }
    cache = get_cache_service()
    cache.set_json(LATEST_KEY, payload, ttl_sec=TTL_SEC)
    return payload


def record_board(
    *,
    run_kind: str,
    board_id: str,
    metrics: dict[str, int | str],
    error: str | None = None,
) -> None:
    """Append per-board outcome to the in-flight latest run."""
    cache = get_cache_service()
    latest = cache.get_json(LATEST_KEY) or {}
    if latest.get("run_kind") != run_kind or latest.get("status") != "running":
        return
    entry: dict[str, int | str] = dict(metrics)
    if error:
        entry["error"] = error[:500]
        warnings = list(latest.get("warnings") or [])
        warnings.append(f"{board_id}: {error[:200]}")
        latest["warnings"] = warnings[-20:]
    sources = dict(latest.get("sources") or {})
    sources[board_id] = entry
    latest["sources"] = sources
    cache.set_json(LATEST_KEY, latest, ttl_sec=TTL_SEC)


def finish_run(
    *,
    run_kind: str,
    active_validated_after: int | None = None,
    extra_warnings: list[str] | None = None,
) -> dict[str, Any]:
    """Close the latest run and push a snapshot to history."""
    cache = get_cache_service()
    latest = cache.get_json(LATEST_KEY) or {"run_kind": run_kind, "sources": {}}
    latest["status"] = "ok"
    latest["finished_at"] = _now_iso()
    if active_validated_after is not None:
        latest["active_validated_after"] = active_validated_after
    if extra_warnings:
        merged = list(latest.get("warnings") or []) + extra_warnings
        latest["warnings"] = merged[-20:]
    cache.set_json(LATEST_KEY, latest, ttl_sec=TTL_SEC)
    history = list(cache.get_json(HISTORY_KEY) or [])
    history.insert(0, latest)
    cache.set_json(HISTORY_KEY, history[:HISTORY_MAX], ttl_sec=TTL_SEC)
    return latest


def get_latest_run() -> dict[str, Any] | None:
    raw = get_cache_service().get_json(LATEST_KEY)
    return raw if isinstance(raw, dict) else None


def get_run_history(limit: int = 5) -> list[dict[str, Any]]:
    history = get_cache_service().get_json(HISTORY_KEY) or []
    if not isinstance(history, list):
        return []
    return [h for h in history[: max(1, min(limit, HISTORY_MAX))] if isinstance(h, dict)]


def last_scrape_run_at() -> str | None:
    latest = get_latest_run()
    if not latest:
        return None
    return latest.get("finished_at") or latest.get("started_at")
