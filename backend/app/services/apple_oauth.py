"""Apple Sign in with Apple (web, form_post callback, JWT client secret)."""

import base64
import json
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import httpx
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from jose import jwt

from app.config import get_settings
from app.services.auth_oauth_redirect import effective_apple_redirect_uri
from app.services.oauth_env import oauth_secret_usable
from app.services.oauth_types import OAuthUserProfile

APPLE_AUTH_URL = "https://appleid.apple.com/auth/authorize"
APPLE_TOKEN_URL = "https://appleid.apple.com/auth/token"
APPLE_KEYS_URL = "https://appleid.apple.com/auth/keys"
APPLE_ISSUER = "https://appleid.apple.com"


class AppleOAuthError(Exception):
    """Apple OAuth configuration or API failure."""


def is_apple_configured() -> bool:
    s = get_settings()
    return bool(
        s.apple_client_id.strip()
        and s.apple_team_id.strip()
        and s.apple_key_id.strip()
        and oauth_secret_usable(s.apple_private_key)
        and effective_apple_redirect_uri(s)
    )


def build_apple_authorize_url(state: str) -> str:
    if not is_apple_configured():
        raise AppleOAuthError("Apple login is not configured")
    s = get_settings()
    redirect_uri = effective_apple_redirect_uri(s)
    params = {
        "response_type": "code",
        "response_mode": "form_post",
        "client_id": s.apple_client_id,
        "redirect_uri": redirect_uri,
        "state": state,
        "scope": "name email",
    }
    return f"{APPLE_AUTH_URL}?{urlencode(params)}"


def _apple_client_secret() -> str:
    s = get_settings()
    now = datetime.now(timezone.utc)
    headers = {"alg": "ES256", "kid": s.apple_key_id}
    payload = {
        "iss": s.apple_team_id,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=10)).timestamp()),
        "aud": "https://appleid.apple.com",
        "sub": s.apple_client_id,
    }
    return jwt.encode(payload, s.apple_private_key, algorithm="ES256", headers=headers)


def _b64url_int(val: str) -> int:
    pad = val + "=" * ((4 - len(val) % 4) % 4)
    return int.from_bytes(base64.urlsafe_b64decode(pad.encode()), "big")


def _decode_apple_id_token(id_token: str) -> dict:
    headers = jwt.get_unverified_header(id_token)
    kid = headers.get("kid")
    if not kid:
        raise AppleOAuthError("Apple id_token missing kid")

    jwks = httpx.get(APPLE_KEYS_URL, timeout=15.0).json()
    keys = jwks.get("keys") or []
    jwk = next((k for k in keys if k.get("kid") == kid), None)
    if not jwk or not jwk.get("n") or not jwk.get("e"):
        raise AppleOAuthError("Apple JWKS missing signing key")

    pub = rsa.RSAPublicNumbers(_b64url_int(jwk["e"]), _b64url_int(jwk["n"])).public_key(default_backend())
    pem = pub.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    ).decode()
    s = get_settings()
    return jwt.decode(
        id_token,
        pem,
        algorithms=["RS256"],
        audience=s.apple_client_id,
        issuer=APPLE_ISSUER,
    )


def exchange_apple_code_for_profile(code: str, user_json: str | None) -> OAuthUserProfile:
    if not is_apple_configured():
        raise AppleOAuthError("Apple login is not configured")
    s = get_settings()
    redirect_uri = effective_apple_redirect_uri(s)
    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": redirect_uri,
        "client_id": s.apple_client_id,
        "client_secret": _apple_client_secret(),
    }
    with httpx.Client(timeout=30.0) as client:
        token_res = client.post(
            APPLE_TOKEN_URL,
            data=data,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        if token_res.status_code != 200:
            raise AppleOAuthError("Could not exchange Apple authorization code")
        body = token_res.json()
        id_token = body.get("id_token")
        if not id_token:
            raise AppleOAuthError("Apple did not return id_token")

    claims = _decode_apple_id_token(str(id_token))
    sub = claims.get("sub")
    email = claims.get("email")
    if not sub:
        raise AppleOAuthError("Apple id_token missing sub")
    if not email:
        raise AppleOAuthError(
            "Apple id_token missing email (private relay or repeat sign-in without email scope)"
        )

    display_name: str | None = None
    if user_json:
        try:
            u = json.loads(user_json)
            if isinstance(u, dict):
                name_obj = u.get("name")
                if isinstance(name_obj, dict):
                    first = name_obj.get("firstName") or ""
                    last = name_obj.get("lastName") or ""
                    display_name = f"{first} {last}".strip() or None
        except json.JSONDecodeError:
            display_name = None

    return OAuthUserProfile(
        provider="apple",
        subject=str(sub),
        email=str(email).lower(),
        name=display_name,
    )
