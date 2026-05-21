from app.services.partner_auth import mint_partner_api_key, verify_partner_token
from tests.test_auth_integration import _sqlite_session


def test_mint_and_verify_partner_key() -> None:
    db = _sqlite_session()
    try:
        row, raw = mint_partner_api_key(db, label="test-partner")
        assert row.id
        from app.config import get_settings

        settings = get_settings()
        from app.services.partner_auth import verify_partner_token

        ok, scopes = verify_partner_token(db, settings, raw)
        assert ok
        assert "export" in scopes
        ok2, _ = verify_partner_token(db, settings, "wrong")
        assert not ok2
    finally:
        db.close()
