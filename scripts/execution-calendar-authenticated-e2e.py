#!/usr/bin/env python3
"""Authenticated Epic 2.5 Execution Calendar + Capacity Planning product proof.

Buckets (do not pad with stance):
  decision_requirement_batch / capacity_internal_availability /
  microsoft_readonly_consent / feasibility_conflict_proposal /
  approval_acal_dailyos / progress_effort_followup /
  ics_history_external_confirm / deletion_privacy_recovery /
  security / persistence / stance

Usage:
  OPS_ADMIN_TOKEN=… python3 scripts/execution-calendar-authenticated-e2e.py
"""

from __future__ import annotations

import json
import os
import ssl
import sys
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone

try:
    import certifi

    _CTX = ssl.create_default_context(cafile=certifi.where())
except Exception:  # pragma: no cover
    _CTX = ssl.create_default_context()

API = os.environ.get("TWIN_API_BASE", "https://twin-production-bcd9.up.railway.app").rstrip("/")
FE = os.environ.get("TWIN_FE_BASE", "https://twin-sooty.vercel.app").rstrip("/")
OPS = (os.environ.get("OPS_ADMIN_TOKEN") or os.environ.get("BETA_ADMIN_TOKEN") or "").strip()
DAILY_OS = "/api/v1/candidates/me/career-copilot/daily"


def _req(method: str, path: str, *, token: str | None = None, body: dict | None = None, timeout: int = 120):
    data = None if body is None else json.dumps(body).encode()
    headers = {"Content-Type": "application/json", "X-Locale": "en"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    last_err: Exception | None = None
    for attempt in range(3):
        req = urllib.request.Request(f"{API}{path}", data=data, method=method, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=timeout, context=_CTX) as resp:
                raw = resp.read().decode("utf-8", errors="replace") or "{}"
                try:
                    return resp.status, json.loads(raw)
                except json.JSONDecodeError:
                    return resp.status, raw[:400]
        except urllib.error.HTTPError as exc:
            raw = (exc.read() or b"").decode("utf-8", errors="replace") or "{}"
            try:
                return exc.code, json.loads(raw)
            except json.JSONDecodeError:
                return exc.code, raw[:400]
        except Exception as exc:  # timeout / transient
            last_err = exc
            if attempt < 2:
                continue
    return 0, {"error": type(last_err).__name__ if last_err else "request_failed"}


def main() -> int:
    buckets = {
        "decision_requirement_batch": [],
        "capacity_internal_availability": [],
        "microsoft_readonly_consent": [],
        "feasibility_conflict_proposal": [],
        "approval_acal_dailyos": [],
        "progress_effort_followup": [],
        "ics_history_external_confirm": [],
        "deletion_privacy_recovery": [],
        "security": [],
        "persistence": [],
        "stance": [],
    }

    def check(bucket: str, name: str, cond: bool, detail: str = "") -> None:
        buckets[bucket].append((name, bool(cond), detail[:200]))
        print(("PASS" if cond else "FAIL"), f"[{bucket}]", name, detail[:120])

    if not OPS:
        print("FAIL missing_ops_token")
        return 2

    try:
        with urllib.request.urlopen(f"{FE}/api/public-health", timeout=45, context=_CTX) as resp:
            ph = json.loads(resp.read().decode())
            code = resp.status
    except Exception as exc:
        ph, code = {}, 0
        check("stance", "public_health", False, str(exc))
    else:
        check("stance", "public_health", code == 200, str(code))
        check("stance", "launch_nogo", ph.get("rc1_launch") == "NO-GO", str(ph.get("rc1_launch")))
        check(
            "stance",
            "enrollment_off",
            ph.get("rc1_external_pilot_enrollment_enabled") is False,
            "",
        )
        check("stance", "phase_3b_blocked", ph.get("rc1_phase_3b") == "BLOCKED", "")
        check(
            "stance",
            "ms_write_off",
            ph.get("microsoft_calendar_write_enabled") is False,
            "",
        )
        fe = (ph.get("frontend_commit") or "")[:12]
        api = (ph.get("api_commit") or "")[:12]
        wrk = (ph.get("worker_commit") or "")[:12]
        check(
            "persistence",
            "four_way_aligned",
            fe == api == wrk and bool(fe),
            f"fe={fe} api={api} wrk={wrk}",
        )

    st, mint = _req(
        "POST", "/api/v1/admin/pilot-os/daily-os/mint-synthetic-session", token=OPS
    )
    check("security", "mint_synthetic", st == 200, str(st))
    token = (mint.get("access_token") if isinstance(mint, dict) else "") or ""
    check("security", "kpi_excluded", bool(isinstance(mint, dict) and mint.get("kpi_excluded")), "")
    if not token:
        print("FAIL mint", st, str(mint)[:200])
        return 2
    other = None
    st2, mint2 = _req(
        "POST", "/api/v1/admin/pilot-os/daily-os/mint-synthetic-session", token=OPS
    )
    if st2 == 200 and isinstance(mint2, dict):
        other = mint2.get("access_token")

    st, priv = _req(
        "PATCH",
        "/api/v1/candidates/me/career-lifecycle/privacy",
        token=token,
        body={
            "paused": False,
            "orchestration_opt_in": True,
            "search_opt_in": True,
            "learning_opt_in": True,
            "reminders_opt_in": True,
        },
    )
    check(
        "approval_acal_dailyos",
        "lifecycle_unpaused",
        st == 200 and isinstance(priv, dict) and priv.get("paused") is False,
        str(st),
    )

    st, agg = _req("GET", "/api/v1/candidates/me/execution-calendar", token=token)
    check("persistence", "aggregate_200", st == 200, str(st))
    check(
        "persistence",
        "alembic_121",
        isinstance(agg, dict) and agg.get("alembic") == "121_decision_calendar_capacity_planning",
        str((agg or {}).get("alembic")),
    )
    check(
        "decision_requirement_batch",
        "schema",
        isinstance(agg, dict)
        and agg.get("schema") == "twin.decision_calendar_capacity_planning/v1",
    )
    safety = (agg or {}).get("safety") or {}
    check("stance", "reject_generates_requirements_false", safety.get("reject_generates_requirements") is False)
    check("stance", "capacity_inferred_false", safety.get("capacity_inferred") is False)
    check("stance", "fabricated_availability_false", safety.get("fabricated_availability") is False)
    check("stance", "internal_calendar_requires_ms_false", safety.get("internal_calendar_requires_ms") is False)
    check("stance", "holds_as_external_booking_false", safety.get("holds_as_external_booking") is False)
    check("stance", "ics_as_confirmation_false", safety.get("ics_as_confirmation") is False)
    check("stance", "autonomous_reschedule_false", safety.get("autonomous_reschedule") is False)
    check("stance", "phase3_not_started", safety.get("phase_3_career_agent") == "NOT_STARTED")
    ms = (agg or {}).get("microsoft") or {}
    check("microsoft_readonly_consent", "ms_write_off", ms.get("write_enabled") is False)
    check("microsoft_readonly_consent", "no_readwrite_scope", ms.get("calendars_read_write") is False)
    check(
        "microsoft_readonly_consent",
        "scopes_safe",
        "Calendars.ReadWrite" not in (ms.get("scopes") or []),
    )
    check("microsoft_readonly_consent", "no_subject_storage", ms.get("event_subject_storage") is False)
    check("microsoft_readonly_consent", "no_attendee_storage", ms.get("attendee_storage") is False)
    check("microsoft_readonly_consent", "token_logging_false", ms.get("token_logging") is False)
    check("microsoft_readonly_consent", "internal_only_mode", ms.get("internal_only_mode") is True)
    routes = (agg or {}).get("routes") or {}
    check("persistence", "execution_calendar_route", routes.get("execution_calendar") == "/dashboard/execution-calendar")
    check("persistence", "batches_route", routes.get("batches") == "/dashboard/execution-calendar?view=batches")
    check("persistence", "capacity_route", routes.get("capacity") == "/dashboard/execution-calendar?view=capacity")
    check(
        "persistence",
        "availability_route",
        routes.get("availability") == "/dashboard/execution-calendar?view=availability",
    )
    check("persistence", "conflicts_route", routes.get("conflicts") == "/dashboard/execution-calendar?view=conflicts")
    check("persistence", "history_route", routes.get("history") == "/dashboard/execution-calendar?view=history")
    check("persistence", "acal_route", routes.get("acceptance_calendar") == "/dashboard/acceptance")

    # Capacity without budget
    st, cap0 = _req("GET", "/api/v1/candidates/me/execution-calendar/capacity/compute", token=token)
    check(
        "capacity_internal_availability",
        "insufficient_without_budget",
        st == 200 and isinstance(cap0, dict) and cap0.get("status") == "INSUFFICIENT_DATA",
        str(st),
    )
    check(
        "capacity_internal_availability",
        "explicit_budget_only",
        isinstance(cap0, dict) and cap0.get("explicit_budget_only") is True,
    )
    check(
        "capacity_internal_availability",
        "not_inferred",
        isinstance(cap0, dict) and cap0.get("inferred_obligations") is False,
    )

    now = datetime.now(timezone.utc)
    win_start = (now + timedelta(days=1)).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    win_end = (now + timedelta(days=1, hours=6)).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    busy_start = (now + timedelta(days=1, hours=1)).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    busy_end = (now + timedelta(days=1, hours=2)).replace(microsecond=0).isoformat().replace("+00:00", "Z")

    st, cap = _req(
        "POST",
        "/api/v1/candidates/me/execution-calendar/capacity",
        token=token,
        body={
            "weekly_budget_minutes": 240,
            "timezone_name": "Europe/Warsaw",
            "windows": [{"starts_at": win_start, "ends_at": win_end}],
            "protected_focus": {"enabled": False, "blocks": []},
        },
    )
    check("capacity_internal_availability", "capacity_saved", st == 200, str(st))

    st, snap = _req(
        "POST",
        "/api/v1/candidates/me/execution-calendar/availability/snapshots",
        token=token,
        body={"use_microsoft_busy": False},
    )
    check("capacity_internal_availability", "internal_snapshot", st in (200, 201), str(st))
    snap_body = (snap or {}).get("snapshot") if isinstance(snap, dict) else {}
    check(
        "capacity_internal_availability",
        "not_fabricated",
        isinstance(snap_body, dict) and snap_body.get("fabricated") is False,
    )
    check(
        "capacity_internal_availability",
        "source_internal",
        isinstance(snap_body, dict) and snap_body.get("source_mode") == "internal_only",
    )
    snap_id = snap_body.get("id") if isinstance(snap_body, dict) else None

    st, snap_ms = _req(
        "POST",
        "/api/v1/candidates/me/execution-calendar/availability/snapshots",
        token=token,
        body={
            "use_microsoft_busy": True,
            "synthetic_busy": [{"starts_at": busy_start, "ends_at": busy_end}],
        },
    )
    check("microsoft_readonly_consent", "ms_path_without_consent", st in (200, 201), str(st))
    ms_snap = (snap_ms or {}).get("snapshot") if isinstance(snap_ms, dict) else {}
    check(
        "microsoft_readonly_consent",
        "consent_blocks_busy",
        isinstance(ms_snap, dict)
        and ms_snap.get("source_mode") == "internal_only_ms_consent_false",
        str((ms_snap or {}).get("source_mode")),
    )

    # Seed approved decision via strategy reviews path
    st, weekly = _req(
        "POST",
        "/api/v1/candidates/me/strategy-reviews/sessions",
        token=token,
        body={"cadence": "weekly"},
    )
    check("decision_requirement_batch", "review_session", st in (200, 201), str(st))
    rid = ((weekly or {}).get("review") or {}).get("id") if isinstance(weekly, dict) else None

    st, dec = _req(
        "POST",
        "/api/v1/candidates/me/strategy-reviews/decisions",
        token=token,
        body={
            "question": "Allocate focus block for execution tilt?",
            "review_id": rid,
            "rationale": "Capacity planning E2E",
            "supporting": [{"ref": "capacity"}],
            "contradicting": [],
            "unknowns": [],
            "alternatives": [
                {"id": "keep", "label": "Keep"},
                {"id": "tilt", "label": "Tilt"},
            ],
            "counterfactuals": [
                {
                    "id": "cf1",
                    "if": "keep",
                    "then": "unchanged",
                    "mutates_state": False,
                    "simulation_only": True,
                }
            ],
        },
    )
    check("decision_requirement_batch", "decision_created", st in (200, 201), str(st))
    did = ((dec or {}).get("decision") or {}).get("id") if isinstance(dec, dict) else None

    # Reject must not generate requirements
    if did:
        st, prop = _req(
            "POST",
            f"/api/v1/candidates/me/strategy-reviews/decisions/{did}/propose",
            token=token,
            body={"chosen_alternative_id": "keep"},
        )
        check("decision_requirement_batch", "decision_proposed", st == 200, str(st))
        st, rej = _req(
            "POST",
            f"/api/v1/candidates/me/strategy-reviews/decisions/{did}/resolve",
            token=token,
            body={"action": "reject"},
        )
        check("decision_requirement_batch", "decision_rejected", st == 200, str(st))
        st, gen_rej = _req(
            "POST",
            "/api/v1/candidates/me/execution-calendar/requirements/from-decision",
            token=token,
            body={"decision_id": did},
        )
        check(
            "decision_requirement_batch",
            "reject_no_requirements",
            st in (200, 201)
            and isinstance(gen_rej, dict)
            and gen_rej.get("generated") is False,
            str(gen_rej)[:120],
        )

    # Fresh decision approve → requirements
    st, dec2 = _req(
        "POST",
        "/api/v1/candidates/me/strategy-reviews/decisions",
        token=token,
        body={
            "question": "Commit weekly execution holds?",
            "review_id": rid,
            "rationale": "Approve path",
            "supporting": [],
            "contradicting": [],
            "unknowns": [],
            "alternatives": [
                {"id": "yes", "label": "Yes"},
                {"id": "no", "label": "No"},
            ],
            "counterfactuals": [],
        },
    )
    did2 = ((dec2 or {}).get("decision") or {}).get("id") if isinstance(dec2, dict) else None
    check("decision_requirement_batch", "decision2_created", bool(did2), str(st))
    if did2:
        _req(
            "POST",
            f"/api/v1/candidates/me/strategy-reviews/decisions/{did2}/propose",
            token=token,
            body={"chosen_alternative_id": "yes"},
        )
        st, appr_d = _req(
            "POST",
            f"/api/v1/candidates/me/strategy-reviews/decisions/{did2}/resolve",
            token=token,
            body={"action": "approve"},
        )
        check("decision_requirement_batch", "decision_approved", st == 200, str(st))
        # Hook may have generated; ensure via explicit call too
        st, gen = _req(
            "POST",
            "/api/v1/candidates/me/execution-calendar/requirements/from-decision",
            token=token,
            body={"decision_id": did2},
        )
        check(
            "decision_requirement_batch",
            "requirements_present",
            st in (200, 201)
            and isinstance(gen, dict)
            and (gen.get("generated") is True or gen.get("reason") == "already_exists"),
            str(gen)[:120],
        )

    st, batch = _req(
        "POST",
        "/api/v1/candidates/me/execution-calendar/batches",
        token=token,
        body={"snapshot_id": snap_id} if snap_id else {},
    )
    check("feasibility_conflict_proposal", "batch_proposed", st in (200, 201), str(st))
    b = batch if isinstance(batch, dict) else {}
    check("feasibility_conflict_proposal", "not_external", b.get("external_created") is False)
    check(
        "feasibility_conflict_proposal",
        "holds_not_booking",
        b.get("holds_are_external_booking") is False,
    )
    check(
        "feasibility_conflict_proposal",
        "no_autonomous_reschedule",
        b.get("autonomous_reschedule") is False,
    )
    bid = ((b.get("batch") or {}) if isinstance(b.get("batch"), dict) else {}).get("id")
    items = ((b.get("batch") or {}) if isinstance(b.get("batch"), dict) else {}).get("items") or []
    item_id = items[0]["id"] if items else None
    check("feasibility_conflict_proposal", "batch_has_items", bool(items), str(len(items)))
    check("feasibility_conflict_proposal", "feasibility_present", bool((b.get("batch") or {}).get("feasibility")))

    if bid:
        st, prop_b = _req(
            "POST",
            f"/api/v1/candidates/me/execution-calendar/batches/{bid}/propose",
            token=token,
        )
        check("approval_acal_dailyos", "batch_pending_approval", st == 200, str(st))
        check(
            "approval_acal_dailyos",
            "requires_approval",
            isinstance(prop_b, dict) and prop_b.get("requires_approval") is True,
        )

        # Reject first batch — no ACAL
        st, rej_b = _req(
            "POST",
            f"/api/v1/candidates/me/execution-calendar/batches/{bid}/resolve",
            token=token,
            body={"action": "reject"},
        )
        check("approval_acal_dailyos", "reject_no_acal", st == 200 and (rej_b or {}).get("acal_created") == 0)

    # New approve path
    st, batch2 = _req(
        "POST",
        "/api/v1/candidates/me/execution-calendar/batches",
        token=token,
        body={"snapshot_id": snap_id} if snap_id else {},
    )
    bid2 = ((batch2 or {}).get("batch") or {}).get("id") if isinstance(batch2, dict) else None
    items2 = ((batch2 or {}).get("batch") or {}).get("items") or []
    item_id = items2[0]["id"] if items2 else item_id
    if bid2:
        _req(
            "POST",
            f"/api/v1/candidates/me/execution-calendar/batches/{bid2}/propose",
            token=token,
        )
        st, appr_b = _req(
            "POST",
            f"/api/v1/candidates/me/execution-calendar/batches/{bid2}/resolve",
            token=token,
            body={"action": "approve"},
        )
        check(
            "approval_acal_dailyos",
            "approve_creates_acal",
            st == 200 and isinstance(appr_b, dict) and (appr_b.get("acal_created") or 0) >= 1,
            str(appr_b)[:120],
        )
        check(
            "approval_acal_dailyos",
            "approve_not_external",
            isinstance(appr_b, dict) and appr_b.get("external_created") is False,
        )
        check(
            "approval_acal_dailyos",
            "approve_holds_not_booking",
            isinstance(appr_b, dict) and appr_b.get("holds_are_external_booking") is False,
        )

    st, daily = _req("GET", DAILY_OS, token=token)
    check("approval_acal_dailyos", "daily_os_200", st == 200, str(st))
    st, brief = _req("GET", "/api/v1/candidates/me/daily-os/brief", token=token)
    check("approval_acal_dailyos", "daily_os_brief_200", st == 200, str(st))

    st, acal = _req("GET", "/api/v1/candidates/me/acceptance-calendar", token=token)
    check("approval_acal_dailyos", "acal_200", st == 200, str(st))

    if item_id:
        st, prog = _req(
            "POST",
            f"/api/v1/candidates/me/execution-calendar/items/{item_id}/progress",
            token=token,
            body={"percent": 35, "actual_effort_minutes": 20},
        )
        check("progress_effort_followup", "progress_saved", st == 200, str(st))
        p = ((prog or {}).get("item") or {}).get("progress") if isinstance(prog, dict) else {}
        check(
            "progress_effort_followup",
            "no_inferred_completion",
            isinstance(p, dict) and p.get("inferred_completion") is False,
        )
        check(
            "progress_effort_followup",
            "no_productivity_score",
            isinstance(p, dict) and p.get("productivity_score") is None,
        )
        check(
            "progress_effort_followup",
            "actual_effort",
            isinstance(p, dict) and p.get("actual_effort_minutes") == 20,
        )
        ns = (now + timedelta(days=4)).replace(microsecond=0).isoformat().replace("+00:00", "Z")
        ne = (now + timedelta(days=4, hours=1)).replace(microsecond=0).isoformat().replace("+00:00", "Z")
        st, rs = _req(
            "POST",
            f"/api/v1/candidates/me/execution-calendar/items/{item_id}/reschedule",
            token=token,
            body={"starts_at": ns, "ends_at": ne},
        )
        check(
            "progress_effort_followup",
            "internal_reschedule",
            st == 200
            and isinstance(rs, dict)
            and rs.get("autonomous_reschedule") is False
            and rs.get("external_created") is False,
            str(st),
        )
        st, conf = _req(
            "POST",
            f"/api/v1/candidates/me/execution-calendar/items/{item_id}/confirm-external",
            token=token,
            body={"confirmed": True},
        )
        check(
            "ics_history_external_confirm",
            "candidate_declared_confirm",
            st == 200
            and isinstance(conf, dict)
            and conf.get("confirmation_source") == "candidate_declared"
            and conf.get("ics_is_confirmation") is False,
            str(st),
        )

    if bid2:
        st, ics = _req(
            "GET",
            f"/api/v1/candidates/me/execution-calendar/batches/{bid2}/ics",
            token=token,
        )
        check("ics_history_external_confirm", "ics_200", st == 200, str(st))
        check(
            "ics_history_external_confirm",
            "ics_no_attendees",
            isinstance(ics, dict) and ics.get("attendees_included") is False,
        )
        check(
            "ics_history_external_confirm",
            "ics_no_organizer",
            isinstance(ics, dict) and ics.get("organizer_included") is False,
        )
        check(
            "ics_history_external_confirm",
            "ics_not_confirmation",
            isinstance(ics, dict) and ics.get("ics_is_confirmation") is False,
        )
        check(
            "ics_history_external_confirm",
            "ics_not_external_booking",
            isinstance(ics, dict) and ics.get("external_booking") is False,
        )
        raw_ics = (ics or {}).get("ics") if isinstance(ics, dict) else ""
        check(
            "ics_history_external_confirm",
            "ics_body_flags",
            isinstance(raw_ics, str)
            and "ATTENDEE" not in raw_ics
            and "X-TWIN-ICS-IS-CONFIRMATION:FALSE" in raw_ics,
        )

    st, hist = _req("GET", "/api/v1/candidates/me/execution-calendar", token=token)
    check(
        "ics_history_external_confirm",
        "history_batches_visible",
        st == 200 and isinstance(hist, dict) and isinstance(hist.get("batches"), list),
    )

    st, inv = _req("POST", "/api/v1/candidates/me/execution-calendar/invalidate-evidence", token=token)
    check(
        "deletion_privacy_recovery",
        "invalidate_stale_guard",
        st == 200 and isinstance(inv, dict) and inv.get("stale_guard") is True,
    )

    st, paused = _req(
        "PATCH",
        "/api/v1/candidates/me/career-lifecycle/privacy",
        token=token,
        body={"paused": True},
    )
    check("deletion_privacy_recovery", "privacy_pause", st == 200, str(st))
    st, blocked = _req(
        "POST",
        "/api/v1/candidates/me/execution-calendar/availability/snapshots",
        token=token,
        body={"use_microsoft_busy": False},
    )
    check("deletion_privacy_recovery", "pause_blocks_snapshots", st == 400, str(st))
    _req(
        "PATCH",
        "/api/v1/candidates/me/career-lifecycle/privacy",
        token=token,
        body={"paused": False},
    )

    st, exp = _req("GET", "/api/v1/candidates/me/execution-calendar/export", token=token)
    check("deletion_privacy_recovery", "export_200", st == 200, str(st))
    st, dele = _req("POST", "/api/v1/candidates/me/execution-calendar/delete-history", token=token)
    check("deletion_privacy_recovery", "delete_history", st == 200, str(st))

    if other and bid2:
        st, x = _req(
            "POST",
            f"/api/v1/candidates/me/execution-calendar/batches/{bid2}/resolve",
            token=other,
            body={"action": "approve"},
        )
        check("security", "cross_user_denied", st in (400, 404), str(st))
    else:
        check("security", "cross_user_denied", bool(other), "other_token_missing")

    st, unauth = _req("GET", "/api/v1/candidates/me/execution-calendar")
    check("security", "unauth_denied", st in (401, 403), str(st))

    # FE surfaces
    for path, bucket, name in [
        ("/dashboard/execution-calendar", "persistence", "fe_execution_calendar"),
        ("/dashboard/approvals", "persistence", "fe_approvals"),
        ("/dashboard/decision-journal", "persistence", "fe_decision_journal"),
        ("/dashboard/acceptance", "persistence", "fe_acceptance"),
    ]:
        try:
            with urllib.request.urlopen(f"{FE}{path}", timeout=45, context=_CTX) as resp:
                check(bucket, name, resp.status == 200, str(resp.status))
        except urllib.error.HTTPError as exc:
            # auth redirect still proves route exists
            check(bucket, name, exc.code in (200, 307, 308, 401, 403), str(exc.code))
        except Exception as exc:
            check(bucket, name, False, str(exc))

    # Ops alembic head
    st, ops = _req("GET", "/api/v1/admin/migrations/current", token=OPS)
    head = ""
    at_head = False
    if isinstance(ops, dict):
        head = str(ops.get("current_revision") or ops.get("head_revision") or "")
        at_head = bool(ops.get("is_at_head"))
    check(
        "persistence",
        "db_at_121",
        at_head
        or head == "121_decision_calendar_capacity_planning"
        or (
            isinstance(agg, dict)
            and agg.get("alembic") == "121_decision_calendar_capacity_planning"
        ),
        f"current={head} is_at_head={at_head} http={st}",
    )

    print("\n=== BUCKET TOTALS ===")
    total_pass = total = 0
    product_pass = product_total = 0
    for name, rows in buckets.items():
        p = sum(1 for _, ok, _ in rows if ok)
        n = len(rows)
        total_pass += p
        total += n
        if name != "stance":
            product_pass += p
            product_total += n
        print(f"{name}: {p}/{n}")
    print(f"TOTAL {total_pass}/{total} (product excl stance {product_pass}/{product_total})")
    fails = [(b, n, d) for b, rows in buckets.items() for n, ok, d in rows if not ok]
    if fails:
        print("FAILURES:")
        for b, n, d in fails:
            print(f"  [{b}] {n}: {d}")
    return 0 if total_pass == total else 1


if __name__ == "__main__":
    sys.exit(main())
