"""Public billing / plan payloads."""

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
        description=(
            "Rough monthly amount in USD for legacy clients: when Stripe exposes a live price in another "
            "currency, this is an illustrative USD conversion; Checkout still charges the configured Price IDs."
        ),
    )
    list_price_monthly: float | None = Field(
        default=None,
        description="Monthly list from Stripe Price when retrievable (major currency units); null uses fallback only.",
    )
    list_price_currency: str | None = Field(
        default=None,
        min_length=3,
        max_length=3,
        description="ISO 4217 uppercase (e.g. USD, PLN) when list_price_monthly is set.",
    )


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
    plan: Literal["premium", "pro"]


class CheckoutResponse(BaseModel):
    url: str


class PortalResponse(BaseModel):
    url: str
