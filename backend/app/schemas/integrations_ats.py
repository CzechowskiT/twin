"""ATS integration setup (webhook URLs for recruiter UI)."""

from pydantic import BaseModel, Field


class AtsProviderSetupOut(BaseModel):
    provider: str
    display_name: str
    webhook_path: str
    webhook_url: str
    secret_configured: bool
    signature_header: str


class AtsOAuthConnectionOut(BaseModel):
    provider: str
    display_name: str
    status: str
    oauth_available: bool
    oauth_state: str | None = None

    model_config = {"from_attributes": True}


class AtsConnectOut(BaseModel):
    provider: str
    status: str
    oauth_available: bool
    message: str
    oauth_state: str | None = None
    authorize_url: str | None = None


class AtsSetupOut(BaseModel):
    providers: list[AtsProviderSetupOut]
    oauth_connections: list[AtsOAuthConnectionOut] = Field(default_factory=list)
    docs_markdown_path: str = Field(default="/docs/ATS_WEBHOOKS.md")
    linkage_note: str
