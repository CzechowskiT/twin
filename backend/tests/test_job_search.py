"""Tests for tokenized job feed search helpers."""

from app.services.job_search import job_text_token_clause, tokenize_job_search


def test_tokenize_job_search_splits_phrases_and_dedupes() -> None:
    tokens = tokenize_job_search("sales director", "Chief Sales Officer, Chief Revenue Officer")
    assert "sales" in tokens
    assert "director" in tokens
    assert "chief" in tokens
    assert "officer" in tokens
    assert "revenue" in tokens
    assert tokens.count("sales") == 1
    assert "or" not in tokens


def test_tokenize_job_search_empty_parts() -> None:
    assert tokenize_job_search(None, "", "   ") == []


def test_job_text_token_clause_none_when_no_tokens() -> None:
    assert job_text_token_clause([]) is None
