"""Guards Railway healthcheck: uvicorn must import app.main without slowapi decorator errors."""


def test_main_app_imports() -> None:
    from app.main import app

    assert app.title == "TWIN API"
