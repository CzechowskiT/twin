"""ATS integration setup (webhook URLs for recruiter UI)."""

from pydantic import BaseModel, Field


class AtsProviderSetupOut(BaseModel):
    provider: str
    display_name: str
    webhook_path: str
    webhook_url: str
    secret_configured: bool
    signature_header: str


class AtsSetupOut(BaseModel):
    providers: list[AtsProviderSetupOut]
    docs_markdown_path: str = Field(default="/docs/ATS_WEBHOOKS.md")
    linkage_note: str
