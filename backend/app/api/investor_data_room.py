"""Investor data room uploads (post-NDA gate; Postgres blob CORE + optional S3)."""

from __future__ import annotations

from urllib.parse import quote

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import RedirectResponse, Response
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.core.deps import get_current_user
from app.database.models import DataRoomDocumentMetadata, User
from app.database.session import get_db
from app.schemas.investor_data_room import DataRoomUploadIn, DataRoomUploadOut
from app.services import data_room_upload as dr_upload
from app.services import investor_wave4 as wave4

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
    if mode == "persistent_upload_slot":
        return (
            "Metadata validated. POST bytes to /data-room/uploads/{id}/file — "
            "stored in persistent Postgres blob for authenticated download."
        )
    if dr_upload.object_storage_enabled():
        return "Metadata recorded; configure client PUT to the presigned URL."
    if settings.data_room_local_upload_enabled:
        return (
            "Metadata validated. Use POST /data-room/uploads/{id}/file for persistent storage "
            "(Postgres blob; optional local mirror)."
        )
    return "Metadata validated; enable DATA_ROOM_LOCAL_UPLOAD_ENABLED for persistent blob upload."


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


def _attachment_headers(filename: str) -> dict[str, str]:
    safe = quote(filename.encode("utf-8"))
    return {"Content-Disposition": f"attachment; filename*=UTF-8''{safe}"}


@router.get("/data-room/documents")
def list_data_room_documents(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """List authenticated user's data room documents (download when blob/S3 present)."""
    return wave4.list_data_room_documents(db, user=user)


@router.get("/data-room/documents/{document_id}/download")
def download_data_room_document(
    document_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Response:
    """Authenticated CORE_PILOT secure download — Postgres blob or optional S3 redirect."""
    row = (
        db.query(DataRoomDocumentMetadata)
        .filter(DataRoomDocumentMetadata.id == document_id, DataRoomDocumentMetadata.user_id == user.id)
        .first()
    )
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Document not found.")
    body, redirect_url, mode = dr_upload.read_download_payload(db, row=row)
    if redirect_url:
        return RedirectResponse(url=redirect_url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)
    if body is None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            detail=f"Blob not available ({mode}). Upload via POST /data-room/uploads/{{id}}/file first.",
        )
    return Response(
        content=body,
        media_type=row.content_type or "application/octet-stream",
        headers=_attachment_headers(row.filename),
    )


@router.get("/data-room/storage-status")
def data_room_storage_status(
    _user: User = Depends(get_current_user),
) -> dict:
    """Honest persistent storage status for investor data room (no secrets)."""
    return dr_upload.storage_backend_status()


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
def upload_data_room_file_persistent(
    document_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> DataRoomUploadOut:
    """Store bytes in persistent Postgres blob (CORE_PILOT). S3 clients use presigned PUT instead."""
    if not settings.data_room_local_upload_enabled:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, detail="Persistent upload is disabled.")
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
        dr_upload.save_persistent_upload_bytes(
            db,
            document_id=row.id,
            data=data,
            expected_size=row.size_bytes,
            expected_checksum=row.checksum_sha256,
        )
    except ValueError as exc:
        detail = _UPLOAD_ERRORS.get(str(exc), "Invalid upload.")
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=detail) from exc
    row.status = "stored_persistent"
    db.commit()
    db.refresh(row)
    return _upload_out(row, settings, mode="postgres_blob", upload_url=None)
