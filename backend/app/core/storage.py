"""
[IDENTITY]: MinIO Storage Service Client
Object storage operations with workspace isolation for multi-tenant architecture.

[INPUT]:
- Configuration: MinIO endpoint, credentials, bucket name from settings
- Object Names: Storage paths with workspace prefix for multi-tenant isolation

[LINK]:
- Config -> app.core.config.get_settings
- Storage Service -> app.services.storage_service (higher-level operations)
- Models -> app.models.asset (metadata tracking)

[OUTPUT]:
- Presigned URLs (upload/download)
- Object metadata (size, etag, content_type)
- Storage operations (put, delete, exists)

[POS]: /backend/app/core/storage.py

[PROTOCOL]:
1. **Workspace Isolation**: All object paths must include workspace_id prefix
2. **Connection Pooling**: Singleton pattern for efficient resource usage
3. **Health Checks**: Provide health_check() for monitoring
4. **Error Handling**: Wrap MinIO S3Error with proper logging
"""

from datetime import timedelta
from typing import Optional
import logging

from minio import Minio
from minio.error import S3Error

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class MinIOClient:
    """
    MinIO client wrapper with connection pooling and health checks.
    Implements workspace-isolated storage paths for multi-tenant security.
    """

    def __init__(
        self,
        endpoint: Optional[str] = None,
        access_key: Optional[str] = None,
        secret_key: Optional[str] = None,
        secure: bool = False,
        bucket_name: Optional[str] = None,
    ):
        """
        Initialize MinIO client with configuration from settings or explicit params.

        Args:
            endpoint: MinIO server endpoint (default from settings)
            access_key: MinIO access key (default from settings)
            secret_key: MinIO secret key (default from settings)
            secure: Use HTTPS connection (default False for dev)
            bucket_name: Default bucket name (default from settings)
        """
        settings = get_settings()

        self.endpoint = endpoint or settings.minio_endpoint
        self.access_key = access_key or settings.minio_root_user
        self.secret_key = secret_key or settings.minio_root_password
        self.bucket_name = bucket_name or settings.minio_bucket
        self.secure = secure

        self.client = Minio(
            self.endpoint,
            access_key=self.access_key,
            secret_key=self.secret_key,
            secure=self.secure,
        )

        # Ensure bucket exists on initialization
        self._ensure_bucket_exists()

    def _ensure_bucket_exists(self) -> None:
        """
        Create the default bucket if it doesn't exist.
        Required for first-time setup.
        """
        try:
            if not self.client.bucket_exists(self.bucket_name):
                self.client.make_bucket(self.bucket_name)
                logger.info(f"Created MinIO bucket: {self.bucket_name}")
            else:
                logger.debug(f"MinIO bucket exists: {self.bucket_name}")
        except S3Error as e:
            logger.error(f"Failed to ensure bucket exists: {e}")
            raise

    def health_check(self) -> bool:
        """
        Check if MinIO service is accessible.

        Returns:
            bool: True if MinIO is healthy, False otherwise
        """
        try:
            self.client.bucket_exists(self.bucket_name)
            return True
        except S3Error:
            return False

    def generate_presigned_upload_url(
        self,
        object_name: str,
        expires: timedelta = timedelta(hours=1),
    ) -> str:
        """
        Generate a presigned URL for uploading an object.

        Args:
            object_name: Full object path including workspace prefix
            expires: URL expiration time (default 1 hour for uploads)

        Returns:
            Presigned PUT URL for direct upload
        """
        return self.client.presigned_put_object(
            self.bucket_name,
            object_name,
            expires=expires,
        )

    def generate_presigned_download_url(
        self,
        object_name: str,
        expires: timedelta = timedelta(minutes=15),
    ) -> str:
        """
        Generate a presigned URL for downloading an object.

        Args:
            object_name: Full object path including workspace prefix
            expires: URL expiration time (default 15 minutes for downloads)

        Returns:
            Presigned GET URL for download
        """
        return self.client.presigned_get_object(
            self.bucket_name,
            object_name,
            expires=expires,
        )

    def object_exists(self, object_name: str) -> bool:
        """
        Check if an object exists in storage.

        Args:
            object_name: Full object path

        Returns:
            bool: True if object exists
        """
        try:
            self.client.stat_object(self.bucket_name, object_name)
            return True
        except S3Error:
            return False

    def get_object_info(self, object_name: str) -> Optional[dict]:
        """
        Get object metadata.

        Args:
            object_name: Full object path

        Returns:
            Object metadata dict or None if not found
        """
        try:
            stat = self.client.stat_object(self.bucket_name, object_name)
            return {
                "size": stat.size,
                "etag": stat.etag,
                "content_type": stat.content_type,
                "last_modified": stat.last_modified,
            }
        except S3Error:
            return None

    def delete_object(self, object_name: str) -> bool:
        """
        Delete an object from storage.

        Args:
            object_name: Full object path

        Returns:
            bool: True if deletion successful
        """
        try:
            self.client.remove_object(self.bucket_name, object_name)
            logger.info(f"Deleted object: {object_name}")
            return True
        except S3Error as e:
            logger.error(f"Failed to delete object {object_name}: {e}")
            return False

    def put_object(
        self,
        object_name: str,
        data,
        length: int,
        content_type: str = "application/octet-stream",
    ) -> dict:
        """
        Upload an object directly (server-side upload).

        Args:
            object_name: Full object path
            data: File-like object or bytes stream (io.BytesIO, etc.)
            length: Total content length in bytes
            content_type: MIME type for the object

        Returns:
            dict with object_name, etag, version_id
        """
        result = self.client.put_object(
            self.bucket_name,
            object_name,
            data,
            length,
            content_type=content_type,
        )
        logger.info(f"Uploaded object: {object_name} ({length} bytes)")
        return {
            "object_name": object_name,
            "etag": result.etag,
            "version_id": result.version_id,
        }


# Singleton instance for application use
_minio_client: Optional[MinIOClient] = None


def get_minio_client() -> MinIOClient:
    """
    Get or create the singleton MinIO client instance.

    Returns:
        MinIOClient: Configured MinIO client
    """
    global _minio_client
    if _minio_client is None:
        _minio_client = MinIOClient()
    return _minio_client


def reset_minio_client() -> None:
    """
    Reset the singleton client (for testing purposes).
    """
    global _minio_client
    _minio_client = None
