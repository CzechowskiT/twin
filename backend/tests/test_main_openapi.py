"""OpenAPI / docs exposure by environment."""

from unittest.mock import patch

from fastapi.testclient import TestClient

from app.config import Settings, get_settings
from app.main import create_app

_PROD_SETTINGS = Settings(
    environment="production",
    secret_key="x" * 32,
    database_url="postgresql+psycopg://twin:twin@db.example.com:5432/twin",
)


@patch("app.main.get_settings", return_value=_PROD_SETTINGS)
def test_openapi_disabled_in_production(_mock_settings) -> None:
    get_settings.cache_clear()
    client = TestClient(create_app())
    assert client.get("/docs").status_code == 404
    assert client.get("/openapi.json").status_code == 404
    assert client.get("/").json() == {"service": "TWIN API", "health": "/api/v1/health"}


@patch("app.main.get_settings")
def test_openapi_enabled_in_development(mock_settings) -> None:
    mock_settings.return_value = Settings(environment="development")
    client = TestClient(create_app())
    assert client.get("/docs").status_code == 200
    assert client.get("/openapi.json").status_code == 200
    root = client.get("/").json()
    assert root.get("docs") == "/docs"
    assert root.get("openapi") == "/openapi.json"
