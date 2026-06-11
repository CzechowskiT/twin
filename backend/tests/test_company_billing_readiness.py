"""Company billing plan usage readiness — honest labels, no live billing."""

from app.config import get_settings
from app.services.company_billing_readiness import DEMO_COMPANY_SLUG, build_company_plan_usage
from app.services.recruiter_company_auth import mint_recruiter_company_token
from tests.test_auth_integration import _sqlite_session


def test_demo_slug_plan_status() -> None:
    db = _sqlite_session()
    get_settings.cache_clear()
    try:
        settings = get_settings()
        out = build_company_plan_usage(db, company_slug=DEMO_COMPANY_SLUG, settings=settings)
        assert out["plan_status"] == "demo"
        assert out["billing_live"] is False
        assert "usage" in out
        assert out["usage"]["roles_count"] >= 0
    finally:
        db.close()
        get_settings.cache_clear()


def test_pilot_slug_when_company_token_exists() -> None:
    db = _sqlite_session()
    get_settings.cache_clear()
    try:
        settings = get_settings()
        _row, _raw = mint_recruiter_company_token(db, company_slug="Acme Billing", label="Acme")
        out = build_company_plan_usage(db, company_slug="acme-billing", settings=settings)
        assert out["plan_status"] == "pilot"
        assert out["billing_live"] is False
        assert out["usage"]["team_seats"] >= 1
    finally:
        db.close()
        get_settings.cache_clear()


def test_integrations_never_mark_billing_live() -> None:
    db = _sqlite_session()
    get_settings.cache_clear()
    try:
        settings = get_settings()
        out = build_company_plan_usage(db, company_slug=DEMO_COMPANY_SLUG, settings=settings)
        billing_row = next(i for i in out["integrations"] if i["id"] == "employer_billing")
        assert billing_row["status"] == "not_live"
    finally:
        db.close()
        get_settings.cache_clear()
