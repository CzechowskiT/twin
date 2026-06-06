"""Nova Hiring PL recruiter demo queue — varied synthetic candidates."""

from datetime import datetime, timezone

from app.core.security import hash_password
from app.database.models import Application, ApplicationStatus, Candidate, Job, JobMatch, User
from app.services.investor_demo_seed import (
    RECRUITER_DEMO_QUEUE_SPECS,
    canonical_recruiter_demo_names,
    ensure_recruiter_inbox_demo,
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


def test_ensure_recruiter_inbox_demo_prunes_legacy_non_canonical_rows() -> None:
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
        job = db.query(Job).filter(Job.external_id == "investor-demo-python-lead").one()
        legacy_user = User(
            email="legacy-nova-demo@twin.career",
            hashed_password=hash_password("synthetic-recruiter-demo-inbox-only"),
            gdpr_consent_at=datetime.now(timezone.utc),
        )
        db.add(legacy_user)
        db.flush()
        legacy_cand = Candidate(
            user_id=legacy_user.id,
            name="Tomasz Czechowski (legacy demo)",
            skills="[]",
            preferred_job_titles="[]",
        )
        db.add(legacy_cand)
        db.flush()
        db.add(
            Application(
                candidate_id=legacy_cand.id,
                job_id=job.id,
                status=ApplicationStatus.APPLIED,
                notes="Investor demo — legacy recruiter batch inbox",
            )
        )
        db.add(JobMatch(candidate_id=legacy_cand.id, job_id=job.id, score=80.0))
        db.commit()
        before = build_recruiter_batch(db, company_slug="nova-hiring-pl", locale="en")
        assert before["total"] == 6

        out = ensure_recruiter_inbox_demo(db, company="Nova Hiring PL")
        db.commit()
        assert out["queue_size"] == 5
        assert out["pruned"] == 1
        assert "Tomasz Czechowski (legacy demo)" in out["removed_names"]

        batch = build_recruiter_batch(db, company_slug="nova-hiring-pl", locale="en")
        assert batch["total"] == 5
        names = {row["candidate_name"] for row in batch["items"]}
        assert names == set(canonical_recruiter_demo_names())
        assert "Tomasz Czechowski (legacy demo)" not in names
    finally:
        db.close()
