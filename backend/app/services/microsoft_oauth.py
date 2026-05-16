"""Microsoft Entra ID / Azure AD OAuth (stub)."""

# TODO(Azure AD / Entra): implement OAuth2 against https://login.microsoftonline.com/common/oauth2/v2.0/authorize
# with openid email profile scopes; exchange at .../token; map `oid` to subject and resolve primary email.


def is_microsoft_configured() -> bool:
    """Return False until Entra client credentials + token exchange are wired."""
    return False


class MicrosoftOAuthError(Exception):
    """Microsoft OAuth not available."""
