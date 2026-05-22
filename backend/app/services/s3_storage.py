"""Optional S3-compatible object storage (AWS S3, Cloudflare R2, MinIO)."""

from __future__ import annotations

import logging
from typing import Any

from app.config import get_settings

logger = logging.getLogger(__name__)


class S3BlobStore:
    """Upload helper; disabled when credentials are missing."""

    def __init__(self) -> None:
        self._client = None
        self._bucket: str | None = None
        s = get_settings()
        key = (s.s3_access_key_id or "").strip()
        secret = (s.s3_secret_access_key or "").strip()
        bucket = (s.s3_bucket_name or "").strip()
        if not (key and secret and bucket):
            return
        try:
            import boto3
            from botocore.config import Config
        except ImportError:
            logger.warning("boto3 not installed — S3 storage disabled")
            return
        kwargs: dict = {
            "service_name": "s3",
            "aws_access_key_id": key,
            "aws_secret_access_key": secret,
            "region_name": (s.s3_region or "auto").strip() or "auto",
            "config": Config(signature_version="s3v4"),
        }
        endpoint = (s.s3_endpoint_url or "").strip()
        if endpoint:
            kwargs["endpoint_url"] = endpoint
        try:
            self._client = boto3.client(**kwargs)
            self._bucket = bucket
            self._client.head_bucket(Bucket=bucket)
        except Exception as exc:
            logger.warning("S3 init failed: %s", exc)
            self._client = None
            self._bucket = None

    @property
    def enabled(self) -> bool:
        return self._client is not None and bool(self._bucket)

    def put_bytes(self, *, key: str, data: bytes, content_type: str) -> str | None:
        if not self.enabled or self._client is None or not self._bucket:
            return None
        try:
            self._client.put_object(
                Bucket=self._bucket,
                Key=key,
                Body=data,
                ContentType=content_type,
            )
            return key
        except Exception as exc:
            logger.error("S3 put_object failed: %s", exc)
            return None

    def presigned_put_url(
        self,
        *,
        key: str,
        content_type: str,
        expires_in: int = 900,
    ) -> str | None:
        """Time-limited HTTPS URL for client PUT uploads."""
        if not self.enabled or self._client is None or not self._bucket:
            return None
        expires_in = max(60, min(3600, int(expires_in)))
        try:
            return self._client.generate_presigned_url(
                "put_object",
                Params={
                    "Bucket": self._bucket,
                    "Key": key,
                    "ContentType": content_type,
                },
                ExpiresIn=expires_in,
            )
        except Exception as exc:
            logger.error("S3 presign PUT failed: %s", exc)
            return None

    def presigned_get_url(self, *, key: str, expires_in: int = 3600) -> str | None:
        """Time-limited HTTPS URL for private objects (default 1 hour)."""
        if not self.enabled or self._client is None or not self._bucket:
            return None
        expires_in = max(60, min(86400 * 7, int(expires_in)))
        try:
            return self._client.generate_presigned_url(
                "get_object",
                Params={"Bucket": self._bucket, "Key": key},
                ExpiresIn=expires_in,
            )
        except Exception as exc:
            logger.error("S3 presign failed: %s", exc)
            return None


def get_s3_blob_store() -> S3BlobStore:
    return S3BlobStore()
