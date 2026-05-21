from app.utils.slug import slugify_company


def test_slugify_company() -> None:
    assert slugify_company("Acme Corp.") == "acme-corp"
    assert slugify_company("") == "company"
