"""Celery application configuration."""

from celery import Celery

from app.config import get_settings

settings = get_settings()

celery_app = Celery(
    "twin",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
)
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Europe/Warsaw",
    enable_utc=True,
    imports=(
        "app.tasks.scrape_tasks",
        "app.tasks.reminder_tasks",
        "app.tasks.placement_tasks",
        "app.tasks.notification_tasks",
        "app.tasks.nightly_auto_apply",
        "app.tasks.agent_dispatch_tasks",
        "app.tasks.founder_command_tasks",
        "app.tasks.activation_matching_tasks",
        "app.tasks.candidate_intelligence_tasks",
        "app.tasks.career_strategy_tasks",
        "app.tasks.opportunity_intelligence_tasks",
        "app.tasks.search_strategy_tasks",
        "app.tasks.worker_identity",
        "app.tasks.company_invite_tasks",
    ),
)


def apply_celery_runtime_config() -> None:
    """Re-read Settings (e.g. after get_settings.cache_clear) and sync broker + eager mode."""
    s = get_settings()
    celery_app.conf.broker_url = s.celery_broker_url
    celery_app.conf.task_always_eager = s.celery_task_always_eager
    # Eager mode: drop Redis result backend so local/tests never hang on reconnect.
    if s.celery_task_always_eager:
        celery_app.conf.result_backend = None
    else:
        celery_app.conf.result_backend = s.celery_result_backend


# In-process tasks (no Redis): set CELERY_TASK_ALWAYS_EAGER=true on the API when no worker service exists.
apply_celery_runtime_config()
celery_app.conf.task_eager_propagates = True


def _configure_beat_schedule() -> None:
    """Autonomous market scrape windows when SCRAPE_BEAT_ENABLED=true."""
    from celery.schedules import crontab

    s = get_settings()
    schedule: dict[str, dict] = {}
    if s.scrape_beat_enabled:
        pl_h = min(23, max(0, int(s.scrape_beat_pl_hour_utc)))
        pl_m = min(59, max(0, int(s.scrape_beat_pl_minute_utc)))
        gh_h = min(23, max(0, int(s.scrape_beat_greenhouse_hour_utc)))
        gh_m = min(59, max(0, int(s.scrape_beat_greenhouse_minute_utc)))
        gl_h = min(23, max(0, int(s.scrape_beat_global_hour_utc)))
        gl_m = min(59, max(0, int(s.scrape_beat_global_minute_utc)))
        li_h = min(23, max(0, int(s.scrape_beat_linkedin_hour_utc)))
        li_m = min(59, max(0, int(s.scrape_beat_linkedin_minute_utc)))
        schedule["market-scrape-pl-daily"] = {
            "task": "app.tasks.scrape_tasks.daily_pl_market_scrape_task",
            "schedule": crontab(hour=pl_h, minute=pl_m),
            "options": {"expires": 14400},
        }
        schedule["market-scrape-greenhouse-daily"] = {
            "task": "app.tasks.scrape_tasks.daily_greenhouse_market_scrape_task",
            "schedule": crontab(hour=gh_h, minute=gh_m),
            "options": {"expires": 14400},
        }
        schedule["market-scrape-global-html"] = {
            "task": "app.tasks.scrape_tasks.daily_global_html_market_scrape_task",
            "schedule": crontab(hour=gl_h, minute=gl_m, day_of_week="1,4"),
            "options": {"expires": 21600},
        }
        if s.linkedin_scrape_enabled:
            schedule["market-scrape-linkedin-daily"] = {
                "task": "app.tasks.scrape_tasks.daily_linkedin_market_scrape_task",
                "schedule": crontab(hour=li_h, minute=li_m),
                "options": {"expires": 7200},
            }
        if s.scrape_beat_legacy_scrape_all:
            hour = min(23, max(0, int(s.scrape_beat_hour_utc)))
            schedule["scrape-all-boards-daily-legacy"] = {
                "task": "app.tasks.scrape_tasks.scrape_all_boards_task",
                "schedule": crontab(hour=hour, minute=12),
                "options": {"expires": 21600},
            }
    if s.placement_retention_beat_enabled:
        ph = min(23, max(0, int(s.placement_retention_beat_hour_utc)))
        schedule["placement-retention-sweep-daily"] = {
            "task": "app.tasks.placement_tasks.placement_retention_sweep",
            "schedule": crontab(hour=ph, minute=15),
        }
    if s.interview_reminder_beat_enabled:
        schedule["interview-reminders-hourly"] = {
            "task": "app.tasks.reminder_tasks.interview_reminders_sweep",
            "schedule": crontab(minute=20),
        }
    if s.career_reminder_beat_enabled:
        cm = min(59, max(0, int(s.career_reminder_beat_minute)))
        schedule["career-reminders-hourly"] = {
            "task": "app.tasks.reminder_tasks.career_reminders_sweep",
            "schedule": crontab(minute=cm),
            "options": {"expires": 3300},
        }
    if s.weekly_digest_beat_enabled:
        wd = min(6, max(0, int(s.weekly_digest_beat_weekday)))
        wh = min(23, max(0, int(s.weekly_digest_beat_hour_utc)))
        schedule["weekly-product-digest"] = {
            "task": "app.tasks.notification_tasks.weekly_product_digest_sweep",
            "schedule": crontab(hour=wh, minute=5, day_of_week=wd),
        }
    if s.nightly_auto_apply_beat_enabled:
        nh = min(23, max(0, int(s.nightly_auto_apply_hour)))
        nm = min(59, max(0, int(s.nightly_auto_apply_minute)))
        schedule["nightly-auto-apply"] = {
            "task": "app.tasks.nightly_auto_apply.nightly_auto_apply_sweep",
            "schedule": crontab(hour=nh, minute=nm),
            "options": {"expires": 7200},
        }
    if s.agent_dispatch_poll_enabled:
        interval = max(15, min(600, int(s.agent_dispatch_poll_interval_seconds or 60)))
        schedule["agent-dispatch-reconcile"] = {
            "task": "app.tasks.agent_dispatch_tasks.reconcile_active_dispatch_runs",
            "schedule": float(interval),
            "options": {"expires": interval},
        }
    if s.founder_command_enabled:
        fc_interval = max(15, min(300, int(s.founder_command_poll_interval_seconds or 20)))
        schedule["founder-command-reconcile"] = {
            "task": "app.tasks.founder_command_tasks.reconcile_founder_commands",
            "schedule": float(fc_interval),
            "options": {"expires": fc_interval},
        }
    # Safe no-op while enrollment OFF; delivers queued invites when Founder flips enrollment ON.
    schedule["company-invite-outbox"] = {
        "task": "app.tasks.company_invite_tasks.process_company_invite_outbox",
        "schedule": crontab(minute="*/5"),
        "options": {"expires": 240},
    }
    celery_app.conf.beat_schedule = schedule


_configure_beat_schedule()

# epic-1.3 career reminder delivery + four-way align nudge 20260729T1400Z
