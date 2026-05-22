"""Backward-compatible import path for ATS OAuth service."""

from app.services.ats_oauth import (  # noqa: F401
    complete_greenhouse_callback,
    list_connections,
    oauth_available,
    start_connect,
)

# Legacy name used in older tests/imports
start_connect_stub = start_connect
