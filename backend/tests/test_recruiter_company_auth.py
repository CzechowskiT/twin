from app.config import get_settings
from app.services.recruiter_company_auth import (
    mint_recruiter_company_token,
    resolve_recruiter_access,
    revoke_recruiter_company_token,
)
from tests.test_auth_integration import _sqlite_session


def test_company_token_resolves_slug() -> None:
    db = _sqlite_session()
    get_settings.cache_clear()
    try:
        settings = get_settings()
        row, raw = mint_recruiter_company_token(db, company_slug="Acme Corp", label="Acme pilot")
        ok, slug = resolve_recruiter_access(db, settings, raw, None)
        assert ok and slug == "acme-corp"
        revoke_recruiter_company_token(db, token_id=row.id)
        ok2, _ = resolve_recruiter_access(db, settings, raw, None)
        assert not ok2
    finally:
        db.close()
        get_settings.cache_clear()
