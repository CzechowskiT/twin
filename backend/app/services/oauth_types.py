"""Shared types for federated sign-in."""

from dataclasses import dataclass


@dataclass(frozen=True)
class OAuthUserProfile:
    """Normalized profile after provider token exchange."""

    provider: str
    subject: str
    email: str
    name: str | None
