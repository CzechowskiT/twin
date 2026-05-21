from app.database.models import Job
from app.services.data_quality_metrics import build_data_quality_report
from tests.test_auth_integration import _sqlite_session


def test_empty_jobs_report() -> None:
    db = _sqlite_session()
    try:
        report = build_data_quality_report(db)
        assert report["total_jobs"] == 0
    finally:
        db.close()


def test_job_quality_percentages() -> None:
    db = _sqlite_session()
    try:
        db.add_all(
            [
                Job(
                    job_board="pracuj",
                    external_id="dq-1",
                    title="A",
                    company="X",
                    url="https://x/1",
                    is_validated=True,
                    location="Warsaw",
                    salary_min=10000,
                ),
                Job(
                    job_board="rocket",
                    external_id="dq-2",
                    title="B",
                    company="Y",
                    url="https://x/2",
                    is_validated=False,
                ),
            ]
        )
        db.commit()
        report = build_data_quality_report(db)
        assert report["total_jobs"] == 2
        assert report["validated_jobs"] == 1
        assert report["missing_location"] == 1
    finally:
        db.close()
