"""Public sandbox demo receipt + static ICS for marketing /demo."""

from fastapi.testclient import TestClient

from app.main import app


def test_public_demo_receipt_shape() -> None:
    client = TestClient(app)
    res = client.get("/api/v1/public/demo-receipt")
    assert res.status_code == 200
    body = res.json()
    assert body["mode"] == "sandbox"
    assert body["apply_outcome"] == "submitted"
    assert body["application_reference"] == "DEMO-82914"
    assert body["ics_path"] == "/api/v1/public/demo-interview.ics"
    assert body["interview_start"].endswith("Z")
    assert body["interview_end"].endswith("Z")
    assert "disclaimer" in body and len(body["disclaimer"]) > 20


def test_public_demo_interview_ics() -> None:
    client = TestClient(app)
    res = client.get("/api/v1/public/demo-interview.ics")
    assert res.status_code == 200
    assert "text/calendar" in res.headers.get("content-type", "")
    assert "attachment" in res.headers.get("content-disposition", "").lower()
    text = res.content.decode("utf-8")
    assert "BEGIN:VCALENDAR" in text
    assert "BEGIN:VEVENT" in text
    assert "END:VCALENDAR" in text
