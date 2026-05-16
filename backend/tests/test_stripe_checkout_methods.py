"""Stripe Checkout payment_method_types parsing."""

from types import SimpleNamespace

from app.services import stripe_billing as sb


def test_default_payment_methods() -> None:
    s = SimpleNamespace(stripe_checkout_payment_method_types="")
    assert sb.checkout_payment_method_types(s) == ["card", "link"]


def test_parse_order_and_dedupe() -> None:
    s = SimpleNamespace(stripe_checkout_payment_method_types="link, card ,card,ideal")
    assert sb.checkout_payment_method_types(s) == ["link", "card", "ideal"]


def test_unknown_types_dropped() -> None:
    s = SimpleNamespace(stripe_checkout_payment_method_types="card,not_a_real_stripe_type,link")
    assert sb.checkout_payment_method_types(s) == ["card", "link"]


def test_note_mentions_wallets_for_card_only() -> None:
    assert "Apple Pay" in sb.checkout_payment_methods_note(["card"])


def test_note_for_card_and_link() -> None:
    assert "Link" in sb.checkout_payment_methods_note(["card", "link"])
