#!/usr/bin/env python3
"""Create Stripe test product/price/webhook for TWIN Premium (prints vars for .env.railway).

Usage:
  export STRIPE_SECRET_KEY=sk_test_...
  python3 scripts/stripe-bootstrap-test.py

Or put STRIPE_SECRET_KEY in backend/.env or .env.railway (not committed).
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def _load_env() -> None:
    for path in (ROOT / ".env.railway", ROOT / "backend" / ".env", ROOT / ".env"):
        if not path.is_file():
            continue
        for line in path.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            key = key.strip()
            if key and key not in os.environ:
                os.environ[key] = val.strip().strip('"').strip("'")


def main() -> int:
    _load_env()
    sk = (os.environ.get("STRIPE_SECRET_KEY") or "").strip()
    if not sk:
        print("Set STRIPE_SECRET_KEY (sk_test_…) in backend/.env or .env.railway", file=sys.stderr)
        return 1
    if not sk.startswith("sk_test"):
        print("Refusing: use Stripe test mode key (sk_test_…)", file=sys.stderr)
        return 1

    import stripe

    stripe.api_key = sk
    api_url = (
        os.environ.get("RAILWAY_API_URL")
        or os.environ.get("API_URL")
        or "https://twin-production-bcd9.up.railway.app"
    ).rstrip("/")
    webhook_url = f"{api_url}/api/v1/billing/webhook"

    prices = stripe.Price.list(active=True, limit=20, type="recurring")
    premium_price = None
    for p in prices.auto_paging_iter():
        if p.get("nickname") == "twin-premium-monthly":
            premium_price = p.id
            break

    if not premium_price:
        product = stripe.Product.create(name="TWIN Premium", metadata={"twin_plan": "premium"})
        price = stripe.Price.create(
            product=product.id,
            unit_amount=499,
            currency="usd",
            recurring={"interval": "month"},
            nickname="twin-premium-monthly",
        )
        premium_price = price.id
        print(f"Created price {premium_price}")
    else:
        print(f"Reusing price {premium_price}")

    wh_secret = None
    for ep in stripe.WebhookEndpoint.list(limit=20).data:
        if ep.url == webhook_url:
            wh_secret = ep.secret
            print(f"Reusing webhook {ep.id}")
            break

    if not wh_secret:
        ep = stripe.WebhookEndpoint.create(
            url=webhook_url,
            enabled_events=[
                "checkout.session.completed",
                "customer.subscription.updated",
                "customer.subscription.deleted",
            ],
        )
        wh_secret = ep.secret
        print(f"Created webhook {ep.id}")

    print("\n# Add to .env.railway then: ./scripts/railway-apply-production-env.sh")
    print(f"STRIPE_SECRET_KEY={sk}")
    print(f"STRIPE_WEBHOOK_SECRET={wh_secret}")
    print(f"STRIPE_PRICE_ID_PREMIUM={premium_price}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
