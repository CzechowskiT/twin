"""Unit tests for free/busy overlap and next-slot search (no HTTP)."""

from datetime import datetime, timezone

from app.services.calendar_scheduling import find_free_slots_iso, find_next_slot_iso, freebusy_overlaps_slot


def _fb(busy: list[tuple[str, str]]) -> dict:
    return {"calendars": {"primary": {"busy": [{"start": a, "end": b} for a, b in busy]}}}


def test_freebusy_overlaps_touching_boundary_no_overlap() -> None:
    slot_start = datetime(2026, 5, 19, 10, 0, tzinfo=timezone.utc)
    slot_end = datetime(2026, 5, 19, 11, 0, tzinfo=timezone.utc)
    fb = _fb([("2026-05-19T09:00:00Z", "2026-05-19T10:00:00Z")])
    assert freebusy_overlaps_slot(fb, slot_start, slot_end) is False


def test_freebusy_overlaps_partial_overlap() -> None:
    slot_start = datetime(2026, 5, 19, 10, 0, tzinfo=timezone.utc)
    slot_end = datetime(2026, 5, 19, 11, 0, tzinfo=timezone.utc)
    fb = _fb([("2026-05-19T10:30:00Z", "2026-05-19T12:00:00Z")])
    assert freebusy_overlaps_slot(fb, slot_start, slot_end) is True


def test_find_next_slot_skips_busy_and_weekend() -> None:
    # Monday 2026-05-18 08:00 UTC — first slot algorithm bumps to aligned time inside workday
    now = datetime(2026, 5, 18, 8, 0, 0, tzinfo=timezone.utc)
    fb = _fb([("2026-05-18T09:00:00Z", "2026-05-18T12:00:00Z")])
    pair = find_next_slot_iso(fb, duration_minutes=60, days_ahead=7, now=now)
    assert pair is not None
    start, end = pair
    assert start.endswith("Z")
    assert end.endswith("Z")
    assert datetime.fromisoformat(start.replace("Z", "+00:00")) >= datetime(
        2026, 5, 18, 12, 0, tzinfo=timezone.utc
    )


def test_find_next_slot_from_saturday_jumps_to_monday() -> None:
    now = datetime.fromisoformat("2026-05-16T10:00:00+00:00")
    fb = _fb([])
    pair = find_next_slot_iso(fb, duration_minutes=60, days_ahead=7, now=now)
    assert pair is not None
    start_dt = datetime.fromisoformat(pair[0].replace("Z", "+00:00"))
    assert start_dt.weekday() == 0  # Monday
    assert start_dt.date() == datetime(2026, 5, 18, tzinfo=timezone.utc).date()


def test_find_free_slots_returns_several() -> None:
    now = datetime(2026, 5, 18, 9, 0, 0, tzinfo=timezone.utc)
    fb = _fb([("2026-05-18T10:00:00Z", "2026-05-18T10:30:00Z")])
    slots = find_free_slots_iso(fb, duration_minutes=60, days_ahead=3, now=now, max_slots=4)
    assert len(slots) >= 2
    for start, end in slots:
        assert start.endswith("Z") and end.endswith("Z")
        assert datetime.fromisoformat(start.replace("Z", "+00:00")) < datetime.fromisoformat(
            end.replace("Z", "+00:00")
        )
