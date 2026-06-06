"""Nova Hiring PL recruiter demo queue — varied synthetic candidates."""

from app.database.models import Application, ApplicationStatus, Job, JobMatch
from app.services.investor_demo_seed import (
    RECRUITER_DEMO_QUEUE_SPECS,
    run_investor_demo_seed,
    upsert_recruiter_demo_queue,
)
from app.services.recruiter_inbox import build_recruiter_batch
from app.services.recruiter_match_explanations import INBOX_FORBIDDEN_PII_KEYS
from tests.test_auth_integration import _sqlite_session


def test_upsert_recruiter_demo_queue_idempotent() -> None:
    db = _sqlite_session()
    try:
        run_investor_demo_seed(
            db,
            email="demo@twin.career",
            password="test-seed-password-12",
            recompute_live_scores=False,
            seed_auto_apply=False,
        )
        db.commit()
        first = upsert_recruiter_demo_queue(db, company="Nova Hiring PL")
        db.commit()
        second = upsert_recruiter_demo_queue(db, company="Nova Hiring PL")
        db.commit()
        assert first["queue_size"] == len(RECRUITER_DEMO_QUEUE_SPECS) == 5
        assert second["queue_size"] == 5
        job = db.query(Job).filter(Job.external_id == "investor-demo-python-lead").one()
        assert db.query(Application).filter(Application.job_id == job.id).count() == 5
        assert db.query(JobMatch).filter(JobMatch.job_id == job.id).count() == 5
    finally:
        db.close()


def test_recruiter_demo_queue_review_cards_no_forbidden_pii() -> None:
    db = _sqlite_session()
    try:
        run_investor_demo_seed(
            db,
            email="demo@twin.career",
            password="test-seed-password-12",
            recompute_live_scores=False,
            seed_auto_apply=False,
        )
        upsert_recruiter_demo_queue(db, company="Nova Hiring PL")
        db.commit()
        batch = build_recruiter_batch(db, company_slug="nova-hiring-pl", locale="pl")
        statuses = {row["status"] for row in batch["items"]}
        assert ApplicationStatus.APPLIED.value in statuses
        assert ApplicationStatus.INTERVIEW.value in statuses
        assert ApplicationStatus.REJECTED.value in statuses
        ewa = next(r for r in batch["items"] if r["candidate_name"] == "Ewa Wiśniewska (demo)")
        assert ewa["review_card"]["data_confidence"] in {"low", "unknown"}
        assert ewa["review_card"]["red_flags"]
        for row in batch["items"]:
            for forbidden in INBOX_FORBIDDEN_PII_KEYS:
                assert forbidden not in row
    finally:
        db.close()
