"""Unit tests — talent pool → inbox Application bridge."""

from __future__ import annotations

from datetime import datetime, timezone

from app.database.models import Application, ApplicationStatus, Job
from app.services.company_roles import create_company_role
from app.services.recruiter_pool_to_pipeline import (
    commit_import_and_assign,
    create_manual_candidate_for_role,
)
from app.services.recruiter_talent_pool_import import preview_and_store
from tests.test_auth_integration import _sqlite_session


def test_manual_candidate_creates_inbox_application() -> None:
    db = _sqlite_session()
    try:
        role = create_company_role(
            db, company_slug="cu-pilot-alpha", title="Backend Engineer", status="active"
        )
        out = create_manual_candidate_for_role(
            db,
            company_slug="cu-pilot-alpha",
            job_id=role["id"],
            display_name="Alex Synthetic",
            location="Remote",
            skills=["Python"],
        )
        assert out["application"]["created"] is True
        app_id = out["application"]["application_id"]
        app = db.query(Application).filter(Application.id == app_id).first()
        assert app is not None
        assert app.status == ApplicationStatus.APPLIED
        assert app.job_id == role["id"]
        job = db.query(Job).filter(Job.id == role["id"]).first()
        assert job is not None
    finally:
        db.close()


def test_csv_commit_assign_creates_applications() -> None:
    db = _sqlite_session()
    try:
        role = create_company_role(
            db, company_slug="cu-pilot-beta", title="Product Designer", status="active"
        )
        preview = preview_and_store(
            db,
            company_slug="cu-pilot-beta",
            csv_text="display_name,job_title,location,skills\nCasey Import,Designer,Warsaw,Figma\n",
            import_source="unit_test",
        )
        import_id = preview["import_id"]
        out = commit_import_and_assign(
            db, company_slug="cu-pilot-beta", import_id=import_id, job_id=role["id"]
        )
        assert out["assigned_count"] >= 1
        assert any(a.get("application_id") for a in out["assigned"])
    finally:
        db.close()


def test_tenant_isolation_role_assign() -> None:
    db = _sqlite_session()
    try:
        role_a = create_company_role(db, company_slug="tenant-a", title="Role A", status="active")
        role_b = create_company_role(db, company_slug="tenant-b", title="Role B", status="active")
        out = create_manual_candidate_for_role(
            db,
            company_slug="tenant-a",
            job_id=role_a["id"],
            display_name="Only A",
            external_ats_id=f"iso-{datetime.now(timezone.utc).timestamp()}",
        )
        app_id = out["application"]["application_id"]
        # Cross-tenant assign must fail
        from app.services.recruiter_pool_to_pipeline import assign_pool_record_to_role

        record_id = out["pool"]["record"]["id"]
        try:
            assign_pool_record_to_role(
                db, company_slug="tenant-b", record_id=record_id, job_id=role_b["id"]
            )
            raised = False
        except ValueError:
            raised = True
        assert raised
        app = db.query(Application).filter(Application.id == app_id).first()
        assert app is not None
        assert app.job_id == role_a["id"]
    finally:
        db.close()
