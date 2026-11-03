"""Pytest defaults — isolate from ambient ops tokens and Redis/Celery hangs."""

from __future__ import annotations

import os

import pytest


# Clear ambient operator tokens before Settings are cached so tests that set
# BETA_ADMIN_TOKEN / OPS_ADMIN_TOKEN / RECRUITER_INBOX_TOKEN are deterministic.
# (Shell/Railway-linked env otherwise makes ops_admin_token win over beta.)
for _key in (
    "OPS_ADMIN_TOKEN",
    "BETA_ADMIN_TOKEN",
    "RECRUITER_INBOX_TOKEN",
    "TWIN_ACCESS_TOKEN",
    "RECRUITER_TOKEN",
    "TWIN_PROD_RECRUITER_JWT",
):
    os.environ.pop(_key, None)

os.environ.setdefault("CELERY_TASK_ALWAYS_EAGER", "true")


@pytest.fixture(scope="session", autouse=True)
def _gate_f_test_runtime_defaults() -> None:
    try:
        from app.config import get_settings
        from app.tasks.celery_app import apply_celery_runtime_config, celery_app

        get_settings.cache_clear()
        apply_celery_runtime_config()
        celery_app.conf.task_always_eager = True
        celery_app.conf.task_eager_propagates = True
        celery_app.conf.result_backend = None
    except Exception:
        pass
