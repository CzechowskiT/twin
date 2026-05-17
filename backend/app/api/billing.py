"""Stripe billing: public plans, Checkout, Customer Portal, webhooks."""

import logging
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy.orm import Session

import stripe
from app.config import Settings, get_settings
from app.core.deps import get_current_user
from app.database.models import User
from app.database.session import get_db
from app.schemas.billing import (
    CheckoutRequest,
    CheckoutResponse,
    PlanOut,
    PlansPublicResponse,
    PortalResponse,
)
from app.services import stripe_billing as stripe_svc

logger = logging.getLogger(__name__)

router = APIRouter()


def _stripe_object_to_dict(obj: object) -> dict[str, Any]:
    if isinstance(obj, dict):
        return obj
    to_dict = getattr(obj, "to_dict", None)
    if callable(to_dict):
        return to_dict()
    raise TypeError("Unsupported Stripe payload type")


def _checkout_configured(settings: Settings) -> bool:
    return bool(settings.stripe_secret_key and settings.stripe_price_id_premium)


@router.get("/plans", response_model=PlansPublicResponse)
def list_plans(settings: Annotated[Settings, Depends(get_settings)]) -> PlansPublicResponse:
    premium_ready = bool(settings.stripe_price_id_premium)
    pro_ready = bool(settings.stripe_price_id_pro)
    pm_types = stripe_svc.checkout_payment_method_types(settings)
    pm_note = stripe_svc.checkout_payment_methods_note(pm_types)
    return PlansPublicResponse(
        checkout_configured=_checkout_configured(settings),
        checkout_payment_methods=pm_types,
        payment_methods_note=pm_note,
        plans=[
            PlanOut(
                id="free",
                name="Free",
                description="Core pipeline: discover roles, track applications, stay GDPR-first.",
                max_tracked_applications=25,
                stripe_price_configured=False,
            ),
            PlanOut(
                id="premium",
                name="Premium",
                description="Unlimited tracked applications, auto-apply where boards allow, priority roadmap.",
                max_tracked_applications=None,
                stripe_price_configured=premium_ready,
            ),
            PlanOut(
                id="pro",
                name="Pro",
                description="Same entitlements as Premium today; reserved for team billing and higher limits.",
                max_tracked_applications=None,
                stripe_price_configured=pro_ready,
            ),
        ],
    )


@router.post("/checkout-session", response_model=CheckoutResponse)
def create_checkout_session(
    body: CheckoutRequest,
    user: Annotated[User, Depends(get_current_user)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> CheckoutResponse:
    if not _checkout_configured(settings):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Billing is not configured on this server.",
        )
    try:
        price_id = stripe_svc.price_id_for_plan(settings, body.plan)
    except ValueError as e:
        code = str(e)
        if code == "pro_not_configured":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Pro plan is not available yet.",
            ) from e
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Billing is not configured on this server.",
        ) from e

    stripe_svc.configure_stripe(settings)
    try:
        params: dict[str, object] = {
            "mode": "subscription",
            "line_items": [{"price": price_id, "quantity": 1}],
            "success_url": f"{settings.frontend_url}/dashboard/billing?checkout=success",
            "cancel_url": f"{settings.frontend_url}/dashboard/billing?checkout=cancel",
            "metadata": {"user_id": str(user.id)},
            "subscription_data": {"metadata": {"user_id": str(user.id)}},
            "payment_method_types": stripe_svc.checkout_payment_method_types(settings),
        }
        if user.stripe_customer_id:
            params["customer"] = user.stripe_customer_id
        else:
            params["customer_email"] = user.email
        session = stripe.checkout.Session.create(**params)
    except stripe.StripeError as e:
        logger.warning("Stripe checkout failed: %s", e.user_message or str(e))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Payment provider error. Try again shortly.",
        ) from e

    url = session.get("url") if isinstance(session, dict) else session.url
    if not url:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Missing checkout URL.")
    return CheckoutResponse(url=url)


@router.post("/portal-session", response_model=PortalResponse)
def create_portal_session(
    user: Annotated[User, Depends(get_current_user)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> PortalResponse:
    if not settings.stripe_secret_key:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Billing not configured.")
    if not user.stripe_customer_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No Stripe customer on file. Start a subscription from Checkout first.",
        )
    stripe_svc.configure_stripe(settings)
    try:
        portal = stripe.billing_portal.Session.create(
            customer=user.stripe_customer_id,
            return_url=f"{settings.frontend_url}/dashboard/billing",
        )
    except stripe.StripeError as e:
        logger.warning("Stripe portal failed: %s", e.user_message or str(e))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Payment provider error. Try again shortly.",
        ) from e

    url = portal.get("url") if isinstance(portal, dict) else portal.url
    if not url:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Missing portal URL.")
    return PortalResponse(url=url)


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    settings: Annotated[Settings, Depends(get_settings)],
    stripe_signature: Annotated[str | None, Header(alias="stripe-signature")] = None,
) -> dict[str, str]:
    if not settings.stripe_webhook_secret or not settings.stripe_secret_key:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Webhook not configured.")
    payload = await request.body()
    if not stripe_signature:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing stripe-signature.")
    stripe_svc.configure_stripe(settings)
    try:
        event = stripe.Webhook.construct_event(
            payload=payload,
            sig_header=stripe_signature,
            secret=settings.stripe_webhook_secret,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid payload.") from e
    except stripe.SignatureVerificationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid signature.") from e

    event_d = _stripe_object_to_dict(event)
    etype = event_d["type"]
    obj_d = _stripe_object_to_dict(event_d["data"]["object"])

    try:
        if etype == "checkout.session.completed":
            stripe_svc.process_checkout_completed(db, obj_d, settings)
        elif etype == "customer.subscription.updated":
            stripe_svc.process_subscription_updated(db, obj_d, settings)
        elif etype == "customer.subscription.deleted":
            stripe_svc.process_subscription_deleted(db, obj_d)
        elif etype == "invoice.payment_succeeded":
            stripe_svc.process_invoice_payment_succeeded(db, obj_d, settings)
    except Exception:
        logger.exception("Stripe webhook handler failed for %s", etype)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Webhook handler error.")

    return {"received": "true"}
