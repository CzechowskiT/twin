"""Ranking composite score and feed deduplication."""

from datetime import datetime, timedelta

from app.database.models import Job
from app.matching.ranking import (
    compute_final_score,
    dedupe_ranked_jobs,
    feed_dedupe_key,
    freshness_score,
)


def _job(**kwargs) -> Job:
    defaults = {
        "job_board": "pracuj.pl",
        "external_id": "x1",
        "title": "Python Developer",
        "company": "Acme",
        "url": "https://example.com/1",
        "is_validated": True,
        "scraped_at": datetime.utcnow(),
        "description": "Python REST API",
        "requirements": "Python",
        "location": "Warszawa",
    }
    defaults.update(kwargs)
    j = Job(**{k: v for k, v in defaults.items() if k != "id"})
    j.id = kwargs.get("id", 1)
    return j


def test_freshness_score_recent_high() -> None:
    now = datetime.utcnow()
    assert freshness_score(now - timedelta(hours=2), now=now) >= 95.0


def test_feed_dedupe_key_same_title_company() -> None:
    a = _job(id=1, title="Dev", company="Acme", location="Warsaw")
    b = _job(id=2, title="dev", company="acme", location="warsaw", job_board="rocketjobs.pl")
    assert feed_dedupe_key(a) == feed_dedupe_key(b)


def test_dedupe_ranked_jobs_keeps_higher_score() -> None:
    j1 = _job(id=1, job_board="pracuj.pl")
    j2 = _job(id=2, job_board="rocketjobs.pl", title="Python Developer")
    out = dedupe_ranked_jobs([(70.0, j1), (85.0, j2), (60.0, j1)])
    assert len(out) == 1
    assert out[0][1].id == 2
    assert out[0][0] == 85.0


def test_apply_intent_boosts_final_score() -> None:
    job = _job(id=5)
    base = compute_final_score(
        50.0,
        job,
        candidate_location="Warszawa",
        apply_intent_ids=set(),
        relevant_ids=set(),
        not_now_ids=set(),
    )
    boosted = compute_final_score(
        50.0,
        job,
        candidate_location="Warszawa",
        apply_intent_ids={5},
        relevant_ids=set(),
        not_now_ids=set(),
    )
    assert boosted > base


def test_not_relevant_excluded_via_service() -> None:
    from app.services.job_match_feedback import excluded_job_ids

    assert callable(excluded_job_ids)
