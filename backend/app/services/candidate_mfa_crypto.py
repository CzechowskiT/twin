"""Epic 2.24 — dedicated MFA AEAD keyring (not JWT/SECRET_KEY).

Fail closed when key unavailable in non-development environments.
"""

from __future__ import annotations

import base64
import hashlib
import logging

from cryptography.fernet import Fernet, InvalidToken

from app.config import get_settings

logger = logging.getLogger(__name__)


class MfaKeyringUnavailable(RuntimeError):
    """Production MFA blocked — dedicated key missing or invalid."""


def _raw_key_material() -> str | None:
    s = get_settings()
    key = (getattr(s, "mfa_aead_key", None) or "").strip()
    return key or None


def keyring_available() -> bool:
    try:
        _fernet()
        return True
    except MfaKeyringUnavailable:
        return False


def _fernet() -> Fernet:
    raw = _raw_key_material()
    settings = get_settings()
    env = (settings.environment or "").strip().lower()
    if not raw:
        if env in {"development", "test", "local"}:
            # Deterministic test/dev material only — never for production Verdict A
            digest = hashlib.sha256(b"twin-mfa-dev-only-not-for-prod").digest()
            return Fernet(base64.urlsafe_b64encode(digest))
        raise MfaKeyringUnavailable("mfa_aead_key_unavailable")
    try:
        # Accept Fernet key (urlsafe-b64 32 bytes) or derive from high-entropy secret
        if len(raw) == 44 and raw.endswith("="):
            return Fernet(raw.encode("ascii"))
        digest = hashlib.sha256(raw.encode("utf-8")).digest()
        return Fernet(base64.urlsafe_b64encode(digest))
    except Exception as exc:  # noqa: BLE001
        raise MfaKeyringUnavailable("mfa_aead_key_invalid") from exc


def encrypt_totp_secret(plain: str) -> str:
    return _fernet().encrypt(plain.encode("utf-8")).decode("ascii")


def decrypt_totp_secret(token: str) -> str:
    try:
        return _fernet().decrypt(token.encode("ascii")).decode("utf-8")
    except InvalidToken as exc:
        raise MfaKeyringUnavailable("mfa_secret_decrypt_failed") from exc


def catalog_keyring() -> dict:
    s = get_settings()
    env = (s.environment or "").strip().lower()
    available = keyring_available()
    return {
        "keyring_available": available,
        "uses_secret_key": False,
        "uses_jwt_signing_key": False,
        "dedicated_mfa_keyring": True,
        "production_fail_closed": env not in {"development", "test", "local"},
    }
