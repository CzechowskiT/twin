"""Partner / ATS-style exports (token-gated; no end-user session)."""

from __future__ import annotations

import csv
from io import StringIO
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.database.models import Application, Job
from app.database.session import get_db
from app.services.partner_auth import partner_export_configured, partner_has_scope, verify_partner_token

router = APIRouter()


def _require_partner_export(
    settings: Annotated[Settings, Depends(get_settings)],
    db: Session = Depends(get_db),
    x_twin_partner_token: Annotated[str | None, Header(alias="X-Twin-Partner-Token")] = None,
) -> str:
    ok, scopes = verify_partner_token(db, settings, x_twin_partner_token)
    if not ok:
        if not partner_export_configured(db, settings):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Partner export is not configured.",
            )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid partner token.")
    if not partner_has_scope(scopes, "export"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Missing scope: export")
    return scopes


@router.get("/exports/applications-recent.csv")
def export_recent_applications_csv(
    _auth: Annotated[str, Depends(_require_partner_export)],
    db: Session = Depends(get_db),
    limit: int = Query(200, ge=1, le=500),
) -> Response:
    """Recent application rows with job metadata (no candidate email — use internal IDs only)."""
    lim = max(1, min(limit, 500))
    rows = (
        db.query(Application, Job)
        .join(Job, Application.job_id == Job.id)
        .order_by(Application.updated_at.desc())
        .limit(lim)
        .all()
    )
    buf = StringIO()
    writer = csv.writer(buf)
    writer.writerow(
        [
            "application_id",
            "candidate_id",
            "job_id",
            "status",
            "applied_at",
            "updated_at",
            "job_title",
            "company",
            "job_board",
            "job_url",
        ],
    )
    for app, job in rows:
        writer.writerow(
            [
                app.id,
                app.candidate_id,
                job.id,
                app.status.value,
                app.applied_at.isoformat() if app.applied_at else "",
                app.updated_at.isoformat() if app.updated_at else "",
                job.title,
                job.company,
                job.job_board,
                job.url,
            ],
        )
    return Response(
        content=buf.getvalue().encode("utf-8"),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="twin-partner-applications-recent.csv"'},
    )
