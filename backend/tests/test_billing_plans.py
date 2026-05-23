"""Public plan list prices (monthly + annual prepay)."""

from app.api.billing import _annual_list_price_usd, list_plans
from app.config import Settings


def test_annual_list_price_usd_discount() -> None:
    assert _annual_list_price_usd(4.99) == 44.91
    assert _annual_list_price_usd(9.99) == 89.91


def test_list_plans_includes_annual_msrp() -> None:
    settings = Settings()
    resp = list_plans(settings)
    by_id = {p.id: p for p in resp.plans}
    assert by_id["premium"].monthly_list_price_usd == 4.99
    assert by_id["premium"].annual_list_price_usd == 44.91
    assert by_id["pro"].monthly_list_price_usd == 9.99
    assert by_id["pro"].annual_list_price_usd == 89.91
