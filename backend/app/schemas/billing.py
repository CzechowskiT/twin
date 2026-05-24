"""Public billing / plan payloads."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class PlanOut(BaseModel):
    id: str
    name: str
    description: str
    max_tracked_applications: int | None = Field(
        default=None,
        description="Null means unlimited tracked applications (non-rejected).",
    )
    stripe_price_configured: bool = False
    monthly_list_price_usd: float = Field(
        ...,
        ge=0,
        description="Marketing list price per month in USD for UI; Stripe Checkout uses configured price IDs.",
    )
    annual_list_price_usd: float = Field(
        ...,
        ge=0,
        description="Annual prepay list price (25% off 12× monthly); Stripe uses annual price IDs when configured.",
    )
    stripe_annual_price_configured: bool = False


class PlansPublicResponse(BaseModel):
    plans: list[PlanOut]
    checkout_configured: bool
    checkout_payment_methods: list[str] = Field(
        default_factory=list,
        description="Stripe Checkout payment_method_types enabled on this server.",
    )
    payment_methods_note: str = Field(
        default="",
        description="Human-readable summary (English) of checkout methods for dashboards.",
    )


class CheckoutRequest(BaseModel):
    plan: Literal["standby", "standard", "premium", "pro"]


class CheckoutResponse(BaseModel):
    url: str


class PortalResponse(BaseModel):
    url: str
