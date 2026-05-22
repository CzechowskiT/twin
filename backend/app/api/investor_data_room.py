"""Investor data room upload metadata (post-NDA gate; no blob until S3 configured)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.core.deps import get_current_user
from app.database.models import User
from app.database.session import get_db
from app.schemas.investor_data_room import DataRoomUploadIn, DataRoomUploadOut
from app.services import data_room_upload as dr_upload

router = APIRouter()


def _storage_note(settings: Settings) -> str:
    if (settings.s3_bucket_name or "").strip():
        return "Metadata recorded; blob upload wiring uses configured S3 bucket."
    return "Metadata validated and queued; file bytes are not stored until S3 is configured on the API."


@router.post("/data-room/uploads", response_model=DataRoomUploadOut, status_code=status.HTTP_201_CREATED)
def register_data_room_upload(
    body: DataRoomUploadIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> DataRoomUploadOut:
    """Register confidential document metadata after NDA acceptance (client-side gate)."""
    try:
        row = dr_upload.record_upload_metadata(
            db,
            user_id=user.id,
            category=body.category,
            filename=body.filename,
            content_type=body.content_type,
            size_bytes=body.size_bytes,
            checksum_sha256=body.checksum_sha256,
        )
    except ValueError as exc:
        code = str(exc)
        detail = {
            "invalid_category": "Unsupported document category.",
            "invalid_filename": "Invalid filename.",
            "invalid_content_type": "Unsupported content type.",
            "invalid_size": "File size out of allowed range.",
            "invalid_checksum": "Invalid SHA-256 checksum.",
        }.get(code, "Invalid upload metadata.")
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=detail) from exc
    db.commit()
    db.refresh(row)
    return DataRoomUploadOut(
        id=row.id,
        category=row.category,
        filename=row.filename,
        content_type=row.content_type,
        size_bytes=row.size_bytes,
        status=row.status,
        storage_note=_storage_note(settings),
        created_at=row.created_at,
    )
