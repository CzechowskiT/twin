"""Low-cardinality Operator metrics and structured stage logs."""

from __future__ import annotations

import json
import logging
import threading
import time
from collections import Counter
from contextlib import contextmanager
from typing import Iterator

logger = logging.getLogger(__name__)
_lock = threading.Lock()
_stage_totals: Counter[tuple[str, str]] = Counter()
_stage_duration_seconds: Counter[str] = Counter()


@contextmanager
def trace_operator_stage(
    *,
    operation: str,
    run_id: str,
    correlation_id: str,
) -> Iterator[None]:
    """Record one stage without putting secrets or unbounded values in metrics."""
    started = time.monotonic()
    result = "success"
    _log(operation, "started", run_id, correlation_id)
    try:
        yield
    except Exception:
        result = "failed"
        raise
    finally:
        elapsed = time.monotonic() - started
        with _lock:
            _stage_totals[(operation, result)] += 1
            _stage_duration_seconds[operation] += elapsed
        _log(operation, result, run_id, correlation_id, elapsed)


def operator_metrics_snapshot() -> dict[str, object]:
    """Return process-local metrics suitable for health collection."""
    with _lock:
        totals = {
            f"{operation}:{result}": count
            for (operation, result), count in sorted(_stage_totals.items())
        }
        durations = {
            operation: round(seconds, 6)
            for operation, seconds in sorted(_stage_duration_seconds.items())
        }
    return {
        "stage_total": totals,
        "stage_duration_seconds_total": durations,
    }


def _log(
    operation: str,
    event: str,
    run_id: str,
    correlation_id: str,
    duration: float | None = None,
) -> None:
    payload: dict[str, object] = {
        "component": "agent_dispatch_operator",
        "operation": operation,
        "event": event,
        "run_id": run_id,
        "correlation_id": correlation_id,
    }
    if duration is not None:
        payload["duration_seconds"] = round(duration, 6)
    logger.info("operator_stage %s", json.dumps(payload, sort_keys=True))
