"""P0 auto-apply reliability: honest submission phases."""

from datetime import datetime

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.automation.types import ApplyOutcome
from app.database.models import (
    Application,
    ApplicationStatus,
    Base,
    Candidate,
    ConfirmationType,
    Job,
    SubmissionStatus,
    SupportedApplyMode,
    User,
)
from app.services.application_submission import (
    confirm_external_submission,
    display_submission_status,
    has_submission_evidence,
    record_submission_from_auto_apply,
    record_submission_link_opened,
    record_submission_one_click,
    supported_apply_mode_for_board,
)
from app.services.application_submission_metrics import mvp_submission_counts


def _sqlite():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, autocommit=False, autoflush=False)()


def _seed_job_candidate(db):
    u = User(email="truth@example.com", hashed_password="x")
    db.add(u)
    db.commit()
    db.refresh(u)
    cand = Candidate(user_id=u.id, name="A", skills="[]", preferred_job_titles="[]")
    db.add(cand)
    db.commit()
    db.refresh(cand)
    job = Job(
        job_board="pracuj.pl",
        external_id="t1",
        title="Dev",
        company="Co",
        url="https://ex/1",
        is_validated=True,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return cand, job


def test_created_in_twin_not_external_confirmed() -> None:
    db = _sqlite()
    cand, job = _seed_job_candidate(db)
    app = Application(candidate_id=cand.id, job_id=job.id, status=ApplicationStatus.PENDING)
    db.add(app)
    record_submission_from_auto_apply(
        app,
        outcome=ApplyOutcome.FORM_FILLED,
        submit=False,
        job=job,
    )
    db.commit()
    assert app.submission_status == SubmissionStatus.APPLICATION_PREPARED
    assert app.status != ApplicationStatus.APPLIED or not has_submission_evidence(app)
    assert display_submission_status(app) != SubmissionStatus.EXTERNAL_SUBMIT_CONFIRMED.value


def test_submitted_outcome_is_attempted_not_confirmed() -> None:
    db = _sqlite()
    cand, job = _seed_job_candidate(db)
    app = Application(candidate_id=cand.id, job_id=job.id)
    db.add(app)
    record_submission_from_auto_apply(
        app,
        outcome=ApplyOutcome.SUBMITTED,
        submit=True,
        job=job,
    )
    db.commit()
    assert app.submission_status == SubmissionStatus.EXTERNAL_SUBMIT_ATTEMPTED
    assert not has_submission_evidence(app)
    assert app.applied_at is None


def test_confirmed_requires_evidence() -> None:
    db = _sqlite()
    cand, job = _seed_job_candidate(db)
    app = Application(
        candidate_id=cand.id,
        job_id=job.id,
        submission_status=SubmissionStatus.EXTERNAL_SUBMIT_CONFIRMED,
        confirmation_type=ConfirmationType.NONE,
    )
    db.add(app)
    db.commit()
    assert not has_submission_evidence(app)

    confirm_external_submission(
        app,
        confirmation_type=ConfirmationType.MANUAL_USER_CONFIRMATION,
        confirmation_text="User confirmed",
    )
    db.commit()
    assert has_submission_evidence(app)
    assert app.submitted_at is not None


def test_failure_reason_saved() -> None:
    db = _sqlite()
    cand, job = _seed_job_candidate(db)
    app = Application(candidate_id=cand.id, job_id=job.id)
    db.add(app)
    record_submission_from_auto_apply(
        app,
        outcome=ApplyOutcome.FAILED,
        submit=True,
        job=job,
        failure_reason="portal timeout",
    )
    db.commit()
    assert app.submission_status == SubmissionStatus.EXTERNAL_SUBMIT_FAILED
    assert "portal timeout" in (app.failure_reason or "")


def test_mvp_stats_split_counts() -> None:
    db = _sqlite()
    cand, job = _seed_job_candidate(db)
    db.add(
        Application(
            candidate_id=cand.id,
            job_id=job.id,
            submission_status=SubmissionStatus.APPLICATION_CREATED_IN_TWIN,
        )
    )
    job2 = Job(
        job_board="pracuj.pl",
        external_id="t2",
        title="Dev2",
        company="Co",
        url="https://ex/2",
        is_validated=True,
    )
    db.add(job2)
    db.commit()
    db.refresh(job2)
    db.add(
        Application(
            candidate_id=cand.id,
            job_id=job2.id,
            submission_status=SubmissionStatus.EXTERNAL_SUBMIT_ATTEMPTED,
        )
    )
    db.commit()
    counts = mvp_submission_counts(db)
    assert counts["applications_created_in_twin"] == 1
    assert counts["external_submit_attempted"] == 1
    assert counts["external_submit_confirmed"] == 0


def test_unsupported_board_not_verified_auto() -> None:
    assert supported_apply_mode_for_board("linkedin.com") == SupportedApplyMode.UNSUPPORTED
    assert supported_apply_mode_for_board("pracuj.pl") == SupportedApplyMode.VERIFIED_AUTO_APPLY


def test_manual_action_not_counted_as_confirmed() -> None:
    db = _sqlite()
    cand, job = _seed_job_candidate(db)
    app = Application(candidate_id=cand.id, job_id=job.id)
    db.add(app)
    record_submission_link_opened(app, job=job)
    db.commit()
    assert app.submission_status == SubmissionStatus.MANUAL_ACTION_REQUIRED
    counts = mvp_submission_counts(db)
    assert counts["manual_action_required"] == 1
    assert counts["external_submit_confirmed"] == 0


def test_one_click_prepared_not_confirmed() -> None:
    db = _sqlite()
    cand, job = _seed_job_candidate(db)
    app = Application(candidate_id=cand.id, job_id=job.id, status=ApplicationStatus.PENDING)
    db.add(app)
    record_submission_one_click(app, job=job)
    db.commit()
    assert app.submission_status == SubmissionStatus.APPLICATION_PREPARED
    assert app.status == ApplicationStatus.PENDING


def test_without_evidence_display_not_confirmed() -> None:
    db = _sqlite()
    cand, job = _seed_job_candidate(db)
    row = Application(candidate_id=cand.id, job_id=job.id, status=ApplicationStatus.APPLIED)
    db.add(row)
    record_submission_from_auto_apply(row, outcome=ApplyOutcome.SUBMITTED, submit=True, job=job)
    db.commit()
    assert display_submission_status(row) != SubmissionStatus.EXTERNAL_SUBMIT_CONFIRMED.value
