"""Investor data room uploads (post-NDA gate; S3 presign or local dev fallback)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.core.deps import get_current_user
from app.database.models import DataRoomDocumentMetadata, User
from app.database.session import get_db
from app.schemas.investor_data_room import DataRoomUploadIn, DataRoomUploadOut
from app.services import data_room_upload as dr_upload

router = APIRouter()

_UPLOAD_ERRORS = {
    "invalid_category": "Unsupported document category.",
    "invalid_filename": "Invalid filename.",
    "invalid_content_type": "Unsupported content type.",
    "invalid_size": "File size out of allowed range.",
    "invalid_checksum": "Invalid SHA-256 checksum.",
    "presign_failed": "Object storage presign failed.",
    "size_mismatch": "Uploaded bytes do not match declared size.",
    "checksum_mismatch": "Checksum does not match uploaded file.",
}


def _storage_note(settings: Settings, *, mode: str) -> str:
    if mode == "s3_presigned_put":
        return "Upload the file with HTTP PUT to upload_url before the link expires."
    if dr_upload.object_storage_enabled():
        return "Metadata recorded; configure client PUT to the presigned URL."
    if settings.data_room_local_upload_enabled:
        return (
            "Metadata validated. Use POST /data-room/uploads/{id}/file for local dev storage "
            "or configure S3_* env vars for presigned PUT."
        )
    return "Metadata validated and queued; configure S3_* on the API for blob storage."


def _upload_out(row: DataRoomDocumentMetadata, settings: Settings, *, mode: str, upload_url: str | None) -> DataRoomUploadOut:
    return DataRoomUploadOut(
        id=row.id,
        category=row.category,
        filename=row.filename,
        content_type=row.content_type,
        size_bytes=row.size_bytes,
        status=row.status,
        storage_note=_storage_note(settings, mode=mode),
        storage_mode=mode,
        storage_key=row.storage_key,
        upload_url=upload_url,
        upload_url_expires_in_seconds=3600 if upload_url else None,
        created_at=row.created_at,
    )


@router.post("/data-room/uploads", response_model=DataRoomUploadOut, status_code=status.HTTP_201_CREATED)
def register_data_room_upload(
    body: DataRoomUploadIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> DataRoomUploadOut:
    """Register confidential document metadata after NDA acceptance (client-side gate)."""
    try:
        row, upload_url, mode = dr_upload.prepare_upload_slot(
            db,
            user_id=user.id,
            category=body.category,
            filename=body.filename,
            content_type=body.content_type,
            size_bytes=body.size_bytes,
            checksum_sha256=body.checksum_sha256,
        )
    except ValueError as exc:
        detail = _UPLOAD_ERRORS.get(str(exc), "Invalid upload metadata.")
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=detail) from exc
    db.commit()
    db.refresh(row)
    return _upload_out(row, settings, mode=mode, upload_url=upload_url)


@router.post(
    "/data-room/uploads/{document_id}/file",
    response_model=DataRoomUploadOut,
)
def upload_data_room_file_local(
    document_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> DataRoomUploadOut:
    """Dev fallback: store bytes on disk when S3 is not configured."""
    if not settings.data_room_local_upload_enabled:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, detail="Local upload is disabled.")
    if dr_upload.object_storage_enabled():
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail="Use the presigned PUT URL returned from POST /data-room/uploads.",
        )
    row = (
        db.query(DataRoomDocumentMetadata)
        .filter(DataRoomDocumentMetadata.id == document_id, DataRoomDocumentMetadata.user_id == user.id)
        .first()
    )
    if not row or not row.storage_key:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Upload slot not found.")
    data = file.file.read()
    try:
        dr_upload.save_local_upload_bytes(
            storage_key=row.storage_key,
            data=data,
            expected_size=row.size_bytes,
            expected_checksum=row.checksum_sha256,
        )
    except ValueError as exc:
        detail = _UPLOAD_ERRORS.get(str(exc), "Invalid upload.")
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=detail) from exc
    row.status = "stored_local"
    db.commit()
    db.refresh(row)
    return _upload_out(row, settings, mode="local_file", upload_url=None)
