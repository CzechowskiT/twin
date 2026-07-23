"""Non-secret and admin-only deploy health payloads for /health and /admin/deploy-health."""

from __future__ import annotations

from typing import Any

from app.config import Settings
from app.services.pilot_stance import resolve_pilot_stance


def _health_ops_str(value: object) -> str:
    return value if isinstance(value, str) else ""


def _health_ops_int(value: object) -> int:
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(round(value))
    return 0


def build_health_ops_public(s: Settings) -> dict[str, Any]:
    """Booleans and coarse metrics safe for public ?ops=1 and /status (no redirect URIs)."""
    from app.api.public import _stripe_checkout_ready
    from app.core.scrape_ops import scrape_worker_ready
    from app.services.apple_oauth import is_apple_configured
    from app.services.github_oauth import is_github_configured
    from app.services.google_calendar_oauth import is_google_calendar_oauth_configured
    from app.services.google_oauth import is_google_configured
    from app.services.linkedin_oauth import is_linkedin_oauth_configured
    from app.services.mail import is_mail_configured
    from app.services.microsoft_calendar_oauth import is_microsoft_calendar_oauth_configured
    from app.services.microsoft_oauth import is_microsoft_configured

    out: dict[str, Any] = {
        "mail_configured": is_mail_configured(s),
        "google_oauth_configured": is_google_configured(),
        "github_oauth_configured": is_github_configured(),
        "apple_oauth_configured": is_apple_configured(),
        "microsoft_oauth_configured": is_microsoft_configured(),
        "google_calendar_configured": is_google_calendar_oauth_configured(),
        "microsoft_calendar_configured": is_microsoft_calendar_oauth_configured(),
        "microsoft_busy_read_enabled": s.microsoft_busy_read_enabled,
        "microsoft_oauth_connect_gate_enabled": s.microsoft_oauth_connect_gate_enabled,
        # Busy-read may be ON on prod; write stays separately gated / never implied.
        "microsoft_calendar_write_enabled": False
        if not s.microsoft_calendar_write_enabled
        else s.microsoft_calendar_write_enabled,
        "microsoft_write_live_claim": False,
        "stripe_checkout_ready": _stripe_checkout_ready(s),
        "stripe_sandbox_ready": bool(
            (s.stripe_secret_key or "").startswith("sk_test")
            and bool(getattr(s, "stripe_sandbox_checkout_enabled", True))
        ),
        "stripe_public_launch": False,
        "scrape_worker_ready": scrape_worker_ready(s),
        "scrape_beat_enabled": s.scrape_beat_enabled,
        "linkedin_oauth_configured": is_linkedin_oauth_configured(),
        "recruiter_inbox_configured": bool((s.recruiter_inbox_token or "").strip()),
        "rc1_operational_frontend": (s.temporary_pilot_canonical_url or "https://twin-sooty.vercel.app").rstrip("/"),
        "rc1_preferred_frontend": "https://twin.care",
        "rc1_pilot_registration_invite_only": bool(s.pilot_registration_invite_only),
        "rc1_external_pilot_enrollment_enabled": bool(s.external_pilot_enrollment_enabled),
        "rc1_on_call_primary_assigned": not str(s.pilot_on_call_primary or "").endswith(
            "UNASSIGNED"
        ),
        "rc1_on_call_secondary_assigned": not str(s.pilot_on_call_secondary or "").endswith(
            "UNASSIGNED"
        ),
        "rc1_pilot_stance": resolve_pilot_stance(s),
        "rc1_launch": "NO-GO",
        "rc1_phase_3b": "BLOCKED",
        "rc1_kpi_token": "NO_REAL_PILOT_DATA",
        "rc1_os_verdict": (
            "FIRST CUSTOMER READY — WAITING FOR FIRST APPROVED PILOT ORGANIZATION"
        ),
        "rc1_founder_approved_real_orgs": 0,
        "rc1_pilot_health_score": 80,
        "rc1_launch_go_readiness_score": 0,
    }
    try:
        from sqlalchemy import text

        from app.database.session import SessionLocal
        from app.services.mvp_public_metrics import count_validated_jobs_public_traction
        from app.services.partner_auth import partner_export_configured

        from app.services.scrape_run_tracking import get_latest_run, last_scrape_run_at

        with SessionLocal() as db_sess:
            if db_sess.bind and db_sess.bind.dialect.name == "postgresql":
                db_sess.execute(text("SET LOCAL statement_timeout = '2s'"))
            out["partner_export_configured"] = partner_export_configured(db_sess, s)
            out["validated_jobs"] = count_validated_jobs_public_traction(db_sess)
            try:
                from app.services.controlled_pilot_os import compute_first_customer_scores

                scores = compute_first_customer_scores(db_sess, s)
                from app.services.controlled_pilot_os import evaluate_launch_go_gate

                gate = evaluate_launch_go_gate(db_sess, s)
                out["rc1_founder_approved_real_orgs"] = int(
                    gate["counts"]["founder_approved_real_orgs"]
                )
                out["rc1_kpi_token"] = scores.get("kpi_token") or "NO_REAL_PILOT_DATA"
                out["rc1_os_verdict"] = scores.get("first_customer_verdict") or out[
                    "rc1_os_verdict"
                ]
                out["rc1_pilot_health_score"] = int(scores.get("pilot_health_score") or 80)
                out["rc1_launch_go_readiness_score"] = int(
                    scores.get("launch_go_readiness_score") or 0
                )
            except Exception:
                pass
        # Avoid heavy market_coverage_report COUNTs on the public health path — use Redis scrape snapshot only.
        from app.services.market_coverage_status import feed_stale_hours_threshold, _parse_run_ts
        from datetime import datetime, timezone

        last_at = last_scrape_run_at()
        latest = get_latest_run()
        active = int(out.get("validated_jobs") or 0)
        target = max(1000, int(s.market_coverage_target_jobs))
        feed_stale = False
        if last_at:
            last_dt = _parse_run_ts(last_at)
            if last_dt:
                hours = (datetime.now(timezone.utc) - last_dt).total_seconds() / 3600.0
                feed_stale = hours > feed_stale_hours_threshold()
        elif active == 0:
            feed_stale = True
        mc: dict[str, Any] = {
            "last_scrape_run_at": last_at,
            "progress_to_10k_pct": round(min(100.0, 100.0 * active / target), 1) if target else None,
            "active_validated_jobs": active,
            "feed_stale": feed_stale,
            "warnings": list(latest.get("warnings") or [])[:8] if latest else [],
        }
        if feed_stale:
            mc["warnings"] = ["feed_stale_no_recent_scrape", *mc["warnings"]]
        if latest and latest.get("status") == "running":
            mc["warnings"] = ["scrape_run_in_progress", *mc["warnings"]]
    except Exception:
        out["partner_export_configured"] = bool((s.partner_export_token or "").strip())
        out["validated_jobs"] = 0
        mc = {}
    if mc:
        out["market_coverage_last_scrape_at"] = _health_ops_str(mc.get("last_scrape_run_at"))
        out["market_coverage_progress_pct"] = _health_ops_int(mc.get("progress_to_10k_pct"))
        out["market_coverage_active_validated"] = _health_ops_int(mc.get("active_validated_jobs"))
        out["market_coverage_feed_stale"] = bool(mc.get("feed_stale"))
        warn = mc.get("warnings") or []
        out["market_coverage_warnings"] = ",".join(str(w) for w in warn[:8]) if warn else ""
        out["market_coverage_ops_hint"] = (
            "Feed stale — check SCRAPE_BEAT_ENABLED + worker beat schedule (docs/SCRAPE_OPS.md)"
            if mc.get("feed_stale")
            else "Market scrape beat OK — see GET /admin/market-coverage-status"
        )
    else:
        out["market_coverage_ops_hint"] = "market_coverage_status_unavailable"
    return out


def build_health_ops_admin_extensions(s: Settings) -> dict[str, Any]:
    """Founder deploy audit fields — Bearer ops admin only (redirect URIs, internal flags)."""
    from app.services.auth_oauth_redirect import (
        effective_apple_redirect_uri,
        effective_github_redirect_uri,
        effective_google_redirect_uri,
    )
    from app.services.calendar_oauth_redirect import (
        effective_google_calendar_redirect_uri,
        effective_microsoft_calendar_redirect_uri,
    )

    s3_on = bool(
        (s.s3_bucket_name or "").strip()
        and (s.s3_access_key_id or "").strip()
        and (s.s3_secret_access_key or "").strip()
    )
    return {
        "google_redirect_uri": effective_google_redirect_uri(s),
        "github_redirect_uri": effective_github_redirect_uri(s),
        "apple_redirect_uri": effective_apple_redirect_uri(s),
        "google_calendar_redirect_uri": effective_google_calendar_redirect_uri(s),
        "microsoft_calendar_redirect_uri": effective_microsoft_calendar_redirect_uri(s),
        "celery_task_always_eager": s.celery_task_always_eager,
        "ops_admin_configured": bool(
            (s.ops_admin_token or "").strip() or (s.beta_admin_token or "").strip()
        ),
        "data_room_s3_enabled": s3_on,
        "data_room_local_demo": not s3_on and s.data_room_local_upload_enabled,
    }
