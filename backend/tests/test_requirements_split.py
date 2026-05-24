"""Tests for requirements must/nice split parser."""

from app.services.requirements_split import split_requirements


def test_split_nice_section() -> None:
    text = """
Must have:
- Python 3
- SQL

Nice to have:
- Kubernetes
- GraphQL
"""
    must, nice = split_requirements(text)
    assert any("Python" in m for m in must)
    assert any("Kubernetes" in n for n in nice)


def test_polish_headers() -> None:
    text = """
Wymagania:
- komunikatywny angielski
Mile widziane:
- doświadczenie w SaaS
"""
    must, nice = split_requirements(text)
    assert len(must) >= 1
    assert len(nice) >= 1
