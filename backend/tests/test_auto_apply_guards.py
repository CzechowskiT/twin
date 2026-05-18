"""Auto-apply guard helpers."""

from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from app.services.auto_apply_guards import enforce_job_blocklists


def test_company_blocklist_blocks() -> None:
    job = MagicMock()
    job.company = "Acme Corp"
    job.title = "Engineer"
    settings = SimpleNamespace(auto_apply_company_blocklist="acme", auto_apply_title_blocklist="")
    with pytest.raises(HTTPException) as exc:
        enforce_job_blocklists(settings=settings, job=job)
    assert exc.value.status_code == 403


def test_title_blocklist_blocks() -> None:
    job = MagicMock()
    job.company = "Good Co"
    job.title = "Junior Support Engineer"
    settings = SimpleNamespace(auto_apply_company_blocklist="", auto_apply_title_blocklist="support")
    with pytest.raises(HTTPException) as exc:
        enforce_job_blocklists(settings=settings, job=job)
    assert exc.value.status_code == 403
