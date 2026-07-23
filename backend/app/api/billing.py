"""Stripe billing: public plans, Checkout, Customer Portal, webhooks."""

# B2B note: this module covers candidate subscription Checkout + Customer Portal + webhooks only.
# A separate "per hire" / success-fee flow for employers (Stripe Connect, invoices, or usage-based)
# and a company billing dashboard are not implemented here — extend these handlers (or add a sibling
# router under the same Stripe config) once employer pricing models exist; avoid duplicating Stripe setup.

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
from app.services import stripe_events

logger = logging.getLogger(__name__)

router = APIRouter()


def _stripe_object_to_dict(obj: object) -> dict[str, Any]:
    if isinstance(obj, dict):
        return obj
    to_dict = getattr(obj, "to_dict", None)
    if callable(to_dict):
        return to_dict()
    raise TypeError("Unsupported Stripe payload type")


def _any_stripe_price_configured(settings: Settings) -> bool:
    return bool(
        settings.stripe_price_id_standby.strip()
        or settings.stripe_price_id_standard.strip()
        or settings.stripe_price_id_premium.strip()
        or settings.stripe_price_id_pro.strip()
    )


def _checkout_configured(settings: Settings) -> bool:
    return bool(settings.stripe_secret_key and _any_stripe_price_configured(settings))


def _stripe_honesty(settings: Settings) -> dict[str, Any]:
    """Candidate plan_payments / plat_stripe_public honesty — sandbox ≠ public launch."""
    key = (settings.stripe_secret_key or "").strip()
    livemode = key.startswith("sk_live")
    test_mode = key.startswith("sk_test")
    sandbox_enabled = bool(getattr(settings, "stripe_sandbox_checkout_enabled", True))
    not_public = bool(getattr(settings, "stripe_not_public_launch", True))
    # Sandbox ready when test keys + at least one price exist; never implies public launch.
    sandbox_ready = bool(
        sandbox_enabled and test_mode and _any_stripe_price_configured(settings) and not livemode
    )
    return {
        "stripe_sandbox_checkout_enabled": sandbox_enabled,
        "stripe_not_public_launch": not_public,
        "sandbox_ready": sandbox_ready,
        "public_launch": False,
        "livemode": livemode,
        "stripe_mode": "live" if livemode else ("test" if test_mode else "unset"),
    }


def _annual_list_price_usd(monthly_usd: float) -> float:
    """25% off 12× monthly annual prepay (pay for 9 months, get 12)."""
    return round(monthly_usd * 12 * 0.75, 2)


@router.get("/plans", response_model=PlansPublicResponse)
def list_plans(settings: Annotated[Settings, Depends(get_settings)]) -> PlansPublicResponse:
    standby_ready = bool(settings.stripe_price_id_standby)
    standard_ready = bool(settings.stripe_price_id_standard)
    premium_ready = bool(settings.stripe_price_id_premium)
    pro_ready = bool(settings.stripe_price_id_pro)
    premium_annual_ready = bool(settings.stripe_price_id_premium_annual)
    pro_annual_ready = bool(settings.stripe_price_id_pro_annual)
    pm_types = stripe_svc.checkout_payment_method_types(settings)
    pm_note = stripe_svc.checkout_payment_methods_note(pm_types)
    honesty = _stripe_honesty(settings)
    return PlansPublicResponse(
        checkout_configured=_checkout_configured(settings),
        checkout_payment_methods=pm_types,
        payment_methods_note=pm_note,
        stripe_sandbox_checkout_enabled=honesty["stripe_sandbox_checkout_enabled"],
        stripe_not_public_launch=honesty["stripe_not_public_launch"],
        sandbox_ready=bool(honesty["sandbox_ready"]),
        public_launch=False,
        stripe_mode=str(honesty["stripe_mode"]),
        plans=[
            PlanOut(
                id="free",
                name="Free",
                description="See how many roles match — preview counts only, no applications.",
                max_tracked_applications=25,
                stripe_price_configured=False,
                monthly_list_price_usd=0.0,
                annual_list_price_usd=0.0,
                stripe_annual_price_configured=False,
            ),
            PlanOut(
                id="standby",
                name="Standby",
                description="Frozen profile: keep your data and history, pause active search while away.",
                max_tracked_applications=25,
                stripe_price_configured=standby_ready,
                monthly_list_price_usd=0.99,
                annual_list_price_usd=_annual_list_price_usd(0.99),
                stripe_annual_price_configured=False,
            ),
            PlanOut(
                id="standard",
                name="Standard",
                description="Apply to roles, view job details, and focus on 80%+ match opportunities.",
                max_tracked_applications=None,
                stripe_price_configured=standard_ready,
                monthly_list_price_usd=1.99,
                annual_list_price_usd=_annual_list_price_usd(1.99),
                stripe_annual_price_configured=False,
            ),
            PlanOut(
                id="premium",
                name="Premium",
                description="Unlimited tracked applications, auto-apply where boards allow, priority roadmap.",
                max_tracked_applications=None,
                stripe_price_configured=premium_ready,
                monthly_list_price_usd=4.99,
                annual_list_price_usd=_annual_list_price_usd(4.99),
                stripe_annual_price_configured=premium_annual_ready,
            ),
            PlanOut(
                id="pro",
                name="Pro",
                description="Same entitlements as Premium today; reserved for team billing and higher limits.",
                max_tracked_applications=None,
                stripe_price_configured=pro_ready,
                monthly_list_price_usd=9.99,
                annual_list_price_usd=_annual_list_price_usd(9.99),
                stripe_annual_price_configured=pro_annual_ready,
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
        if code in ("pro_not_configured", "standby_not_configured", "standard_not_configured"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="That plan is not available yet.",
            ) from e
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Billing is not configured on this server.",
        ) from e

    stripe_svc.configure_stripe(settings)
    try:
        md: dict[str, str] = {"user_id": str(user.id)}
        bn = (getattr(user, "billing_company_name", None) or "").strip()
        tid = (getattr(user, "billing_tax_id", None) or "").strip()
        if bn:
            md["billing_company_name"] = bn[:200]
        if tid:
            md["billing_tax_id"] = tid[:64]
        params: dict[str, object] = {
            "mode": "subscription",
            "line_items": [{"price": price_id, "quantity": 1}],
            "success_url": f"{settings.frontend_url}/dashboard/billing?checkout=success",
            "cancel_url": f"{settings.frontend_url}/dashboard/billing?checkout=cancel",
            "metadata": md,
            "subscription_data": {"metadata": md},
            "payment_method_types": stripe_svc.checkout_payment_method_types(settings),
            "allow_promotion_codes": True,
            "tax_id_collection": {"enabled": True},
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
    honesty = _stripe_honesty(settings)
    return CheckoutResponse(
        url=url,
        stripe_sandbox_checkout_enabled=honesty["stripe_sandbox_checkout_enabled"],
        stripe_not_public_launch=honesty["stripe_not_public_launch"],
        sandbox_ready=bool(honesty["sandbox_ready"]),
        public_launch=False,
        stripe_mode=str(honesty["stripe_mode"]),
    )


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
    event_id = str(event_d.get("id") or "").strip()
    if not event_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Event missing id.")
    etype = event_d["type"]
    livemode = bool(event_d.get("livemode", False))

    if stripe_events.already_processed(db, event_id):
        return {"received": "true", "replayed": "true"}

    ledger = stripe_events.record_received(
        db,
        event_id=event_id,
        event_type=etype,
        livemode=livemode,
    )
    if ledger is not None and ledger.handler_status in (
        stripe_events.STATUS_SUCCESS,
        stripe_events.STATUS_IGNORED,
    ):
        return {"received": "true", "replayed": "true"}

    obj_d = _stripe_object_to_dict(event_d["data"]["object"])
    handled_types = frozenset(
        {
            "checkout.session.completed",
            "customer.subscription.updated",
            "customer.subscription.deleted",
            "invoice.payment_succeeded",
        }
    )

    try:
        if etype == "checkout.session.completed":
            stripe_svc.process_checkout_completed(db, obj_d, settings)
        elif etype == "customer.subscription.updated":
            stripe_svc.process_subscription_updated(db, obj_d, settings)
        elif etype == "customer.subscription.deleted":
            stripe_svc.process_subscription_deleted(db, obj_d)
        elif etype == "invoice.payment_succeeded":
            stripe_svc.process_invoice_payment_succeeded(db, obj_d, settings)
        if etype in handled_types:
            stripe_events.mark_success(db, ledger)
        else:
            stripe_events.mark_ignored(db, ledger)
        if ledger is not None:
            db.commit()
    except Exception as exc:
        stripe_events.mark_failed(db, ledger, str(exc))
        if ledger is not None:
            db.commit()
        # Avoid dumping raw exception tracebacks from third-party payloads into logs.
        logger.error("Stripe webhook handler failed for %s", etype)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Webhook handler error.") from exc

    return {"received": "true"}
