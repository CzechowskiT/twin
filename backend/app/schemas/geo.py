"""Public geo / jurisdiction hints (no auth)."""

from pydantic import BaseModel, Field


class JurisdictionHintOut(BaseModel):
    """Best-effort region for legal copy — not a legal determination of user status."""

    country_code: str | None = Field(description="ISO 3166-1 alpha-2 when known")
    legal_region: str = Field(
        description="EU_EEA | UK | US | CH | JP | CN | OTHER — drives default legal notices in the UI",
    )
    source: str = Field(
        description="cloudflare_header | ip_lookup | coordinates | fallback | disabled",
    )
