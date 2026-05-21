from app.database.models import PartnerApiKey
from app.services.partner_auth import mint_partner_api_key, revoke_partner_api_key, verify_partner_token
from app.config import get_settings
from tests.test_auth_integration import _sqlite_session


def test_revoke_partner_key() -> None:
    db = _sqlite_session()
    get_settings.cache_clear()
    try:
        row, raw = mint_partner_api_key(db, label="revoke-me")
        settings = get_settings()
        assert verify_partner_token(db, settings, raw)[0]
        revoke_partner_api_key(db, key_id=row.id)
        assert not verify_partner_token(db, settings, raw)[0]
    finally:
        db.close()
        get_settings.cache_clear()
