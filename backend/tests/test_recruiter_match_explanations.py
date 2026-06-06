from datetime import datetime, timezone

from app.database.models import Application, ApplicationStatus, Candidate, Job, JobMatch, User
from app.services.recruiter_match_explanations import (
    PII_CONTEXT_APPLICATION_REVIEW,
    build_recruiter_match_summary,
)
from tests.test_auth_integration import _sqlite_session


def test_build_recruiter_match_summary_includes_score_and_reasons() -> None:
    db = _sqlite_session()
    try:
        user = User(
            email="match@example.com",
            hashed_password="x",
            gdpr_consent_at=datetime.now(timezone.utc),
        )
        db.add(user)
        db.flush()
        cand = Candidate(
            user_id=user.id,
            name="Alex",
            skills='["Python", "FastAPI"]',
            preferred_job_titles='["Python Developer"]',
            location="Warsaw",
        )
        db.add(cand)
        job = Job(
            job_board="pracuj",
            external_id="rm-j1",
            title="Senior Python Developer",
            company="Acme Corp",
            url="https://example.com/j",
            requirements="Python FastAPI backend",
            location="Warsaw",
            is_validated=True,
        )
        db.add(job)
        db.flush()
        summary = build_recruiter_match_summary(db, cand, job, locale="en")
        assert summary["match_score"] >= 40.0
        assert summary["match_score_label"] in {"excellent", "good", "possible", "weak"}
        assert 1 <= len(summary["match_reasons"]) <= 3
        assert summary["human_decision_required"] is True
        assert summary["pii_context"] == PII_CONTEXT_APPLICATION_REVIEW
        card = summary["review_card"]
        assert card["human_decision_required"] is True
        assert card["data_confidence"] in {"high", "medium", "low", "unknown"}
        assert isinstance(card["why_this_candidate"], str) and card["why_this_candidate"]
        assert isinstance(card["requirements_matched"], list)
        assert isinstance(card["uncertain_or_missing"], list)
        assert isinstance(card["what_to_verify"], list)
        assert isinstance(card["red_flags"], list)
        assert isinstance(card["disclaimer"], str) and card["disclaimer"]
    finally:
        db.close()


def test_build_recruiter_match_summary_uses_persisted_job_match() -> None:
    db = _sqlite_session()
    try:
        user = User(
            email="persist@example.com",
            hashed_password="x",
            gdpr_consent_at=datetime.now(timezone.utc),
        )
        db.add(user)
        db.flush()
        cand = Candidate(user_id=user.id, name="B", skills="[]", preferred_job_titles="[]")
        db.add(cand)
        job = Job(
            job_board="pracuj",
            external_id="rm-j2",
            title="Dev",
            company="Bravo Inc",
            url="https://example.com/j2",
            is_validated=True,
        )
        db.add(job)
        db.flush()
        db.add(JobMatch(candidate_id=cand.id, job_id=job.id, score=88.5))
        db.commit()
        summary = build_recruiter_match_summary(db, cand, job, locale="pl")
        assert summary["match_score"] == 88.5
        assert summary["match_score_label"] == "excellent"
        assert len(summary["match_reasons"]) <= 3
        assert summary["review_card"]["data_confidence"] in {"high", "medium", "low", "unknown"}
        assert summary["review_card"]["human_decision_required"] is True
    finally:
        db.close()


def test_build_recruiter_batch_includes_match_fields() -> None:
    from app.services.recruiter_inbox import build_recruiter_batch

    db = _sqlite_session()
    try:
        user = User(
            email="batch@example.com",
            hashed_password="x",
            gdpr_consent_at=datetime.now(timezone.utc),
        )
        db.add(user)
        db.flush()
        cand = Candidate(
            user_id=user.id,
            name="Alex",
            skills='["Python"]',
            preferred_job_titles='["Engineer"]',
        )
        db.add(cand)
        job = Job(
            job_board="pracuj",
            external_id="rm-j3",
            title="Engineer",
            company="Acme Corp",
            url="https://example.com/j3",
            requirements="Python",
            is_validated=True,
        )
        db.add(job)
        db.flush()
        db.add(
            Application(
                candidate_id=cand.id,
                job_id=job.id,
                status=ApplicationStatus.APPLIED,
            )
        )
        db.commit()
        out = build_recruiter_batch(db, company_slug="acme-corp", locale="en")
        row = out["items"][0]
        assert "match_score" in row
        assert "match_score_label" in row
        assert isinstance(row["match_reasons"], list)
        assert row["human_decision_required"] is True
        assert row["pii_context"] == PII_CONTEXT_APPLICATION_REVIEW
        assert "review_card" in row
        assert row["review_card"]["human_decision_required"] is True
        assert row["review_card"]["data_confidence"] in {"high", "medium", "low", "unknown"}
    finally:
        db.close()


def test_review_card_locale_pl_and_sparse_profile() -> None:
    db = _sqlite_session()
    try:
        user = User(
            email="sparse@example.com",
            hashed_password="x",
            gdpr_consent_at=datetime.now(timezone.utc),
        )
        db.add(user)
        db.flush()
        cand = Candidate(user_id=user.id, name="Sparse", skills="[]", preferred_job_titles="[]")
        db.add(cand)
        job = Job(
            job_board="pracuj",
            external_id="rm-sparse",
            title="Senior Architect",
            company="Sparse Co",
            url="https://example.com/sp",
            requirements="Kubernetes Terraform",
            is_validated=True,
        )
        db.add(job)
        db.flush()
        card_en = build_recruiter_match_summary(db, cand, job, locale="en")["review_card"]
        card_pl = build_recruiter_match_summary(db, cand, job, locale="pl")["review_card"]
        assert card_en["disclaimer"] != card_pl["disclaimer"]
        assert any("skills" in s.lower() or "umiejętności" in s.lower() for s in card_en["uncertain_or_missing"] + card_pl["uncertain_or_missing"])
        assert card_en["data_confidence"] in {"low", "unknown"}
        assert card_en["red_flags"]
    finally:
        db.close()
