"""Auto-apply helpers."""

from app.automation.apply_engine import run_auto_apply
from app.automation.challenges import page_has_challenge
from app.automation.types import ApplyOutcome


def test_detects_cloudflare_polish() -> None:
    html = "<html><body>Potwierdź, że jesteś człowiekiem</body></html>"
    assert page_has_challenge(html, "https://www.indeed.com/pagead/clk")


def test_unsupported_board() -> None:
    from pathlib import Path
    import tempfile

    with tempfile.TemporaryDirectory() as tmp:
        result = run_auto_apply(
            job_board="unknown-board.xyz",
            job_url="https://example.com/job/1",
            name="Jan Kowalski",
            email="jan@example.com",
            phone="",
            resume_path=None,
            headless=True,
            state_dir=Path(tmp),
            submit=False,
        )
    assert result.outcome == ApplyOutcome.UNSUPPORTED
