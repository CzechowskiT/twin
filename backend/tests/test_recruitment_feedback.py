"""Recruitment feedback structuring."""

from app.services.recruitment_feedback import build_feedback_insights, parse_stored_insights_json


def test_build_feedback_insights_fallback_has_keys() -> None:
    raw = "They wanted hands-on Celonis and Signavio. I was too light on process mining demos."
    out = build_feedback_insights(raw)
    assert "summary" in out
    assert out.get("source") == "fallback"
    assert isinstance(out.get("upskill_actions"), list)


def test_parse_stored_insights_json_none() -> None:
    assert parse_stored_insights_json(None) is None
    assert parse_stored_insights_json("") is None
