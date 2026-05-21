"""Nightly auto-apply helpers (no DB fixtures)."""

from app.config import get_settings
from app.database.models import Job
from app.services.nightly_auto_apply import is_supported_job


def test_is_supported_pracuj() -> None:
    settings = get_settings()
    job = Job(job_board="pracuj", url="https://www.pracuj.pl/job/1", title="Dev", company="X")
    assert is_supported_job(job, settings) is True


def test_is_supported_rocketjobs_false() -> None:
    settings = get_settings()
    job = Job(job_board="rocketjobs", url="https://rocketjobs.pl/x", title="Dev", company="X")
    assert is_supported_job(job, settings) is False

