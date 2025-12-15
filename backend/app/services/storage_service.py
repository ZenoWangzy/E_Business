"""
Storage Service - Business Logic for File Storage Operations
Implements workspace-isolated storage with presigned URLs (AC: 1-11, 12-16)
"""

import uuid
import hashlib
import re
from datetime import timedelta
from typing import Optional
import logging

from app.core.storage import get_minio_client, MinIOClient

logger = logging.getLogger(__name__)


def secure_filename(filename: str) -> str:
    """
    Sanitize filename to prevent path traversal attacks.

    Args:
        filename: Original filename

    Returns:
        Sanitized filename safe for storage paths
    """
    # Remove any path separators and dots at the start
    filename = filename.replace("/", "_").replace("\\", "_")
    filename = re.sub(r"^\.+", "", filename)
    # Remove any non-alphanumeric characters except .-_
    filename = re.sub(r"[^\w.\-]", "_", filename)
    # Ensure filename is not empty
    if not filename or filename == "_":
        filename = "unnamed_file"
    return filename


def get_workspace_storage_path(
    workspace_id: str,
    asset_id: str,
    filename: str,
) -> str:
    """
    Generate workspace-isolated storage path for multi-tenant security.

    Path format: workspaces/{workspace_id}/assets/{asset_id}/{sanitized_filename}

    Args:
        workspace_id: Workspace UUID
        asset_id: Asset UUID
        filename: Original filename

    Returns:
        Full storage path with workspace isolation
    """
    sanitized_filename = secure_filename(filename)
    return f"workspaces/{workspace_id}/assets/{asset_id}/{sanitized_filename}"


def calculate_file_checksum(file_data: bytes) -> str:
    """
    Calculate MD5 checksum for file integrity verification.

    Args:
        file_data: File binary data

    Returns:
        MD5 hexdigest string
    """
    return hashlib.md5(file_data).hexdigest()


class StorageService:
    """
    Storage service for managing file uploads and downloads with workspace isolation.
    Implements presigned URL generation for direct client-to-MinIO uploads.
    """

    def __init__(self, minio_client: Optional[MinIOClient] = None):
        """
        Initialize storage service.

        Args:
            minio_client: Optional MinIO client (uses singleton if not provided)
        """
        self._client = minio_client or get_minio_client()

    @property
    def client(self) -> MinIOClient:
        """Get the MinIO client instance."""
        return self._client

    def generate_upload_url(
        self,
        workspace_id: str,
        asset_id: str,
        filename: str,
        expires_minutes: int = 60,
    ) -> dict:
        """
        Generate presigned URL for uploading a file.

        Args:
            workspace_id: Workspace UUID for isolation
            asset_id: Asset UUID for the file
            filename: Original filename
            expires_minutes: URL expiration in minutes (default 60)

        Returns:
            dict with upload_url, storage_path, and expires_in
        """
        storage_path = get_workspace_storage_path(workspace_id, asset_id, filename)
        expires = timedelta(minutes=expires_minutes)

        upload_url = self._client.generate_presigned_upload_url(
            storage_path,
            expires=expires,
        )

        logger.info(
            f"Generated upload URL for asset {asset_id} in workspace {workspace_id}"
        )

        return {
            "upload_url": upload_url,
            "storage_path": storage_path,
            "expires_in": expires_minutes * 60,  # seconds
        }

    def generate_download_url(
        self,
        workspace_id: str,
        asset_id: str,
        filename: str,
        expires_minutes: int = 15,
    ) -> dict:
        """
        Generate presigned URL for downloading a file.

        Args:
            workspace_id: Workspace UUID for isolation
            asset_id: Asset UUID for the file
            filename: Original filename
            expires_minutes: URL expiration in minutes (default 15)

        Returns:
            dict with download_url and expires_in
        """
        storage_path = get_workspace_storage_path(workspace_id, asset_id, filename)
        expires = timedelta(minutes=expires_minutes)

        download_url = self._client.generate_presigned_download_url(
            storage_path,
            expires=expires,
        )

        logger.info(
            f"Generated download URL for asset {asset_id} in workspace {workspace_id}"
        )

        return {
            "download_url": download_url,
            "expires_in": expires_minutes * 60,  # seconds
        }

    def verify_upload(
        self,
        workspace_id: str,
        asset_id: str,
        filename: str,
        expected_size: Optional[int] = None,
    ) -> dict:
        """
        Verify that a file was successfully uploaded to MinIO.

        Args:
            workspace_id: Workspace UUID
            asset_id: Asset UUID
            filename: Original filename
            expected_size: Expected file size for validation

        Returns:
            dict with verification status and metadata

        Raises:
            ValueError: If file not found or size mismatch
        """
        storage_path = get_workspace_storage_path(workspace_id, asset_id, filename)

        object_info = self._client.get_object_info(storage_path)
        if object_info is None:
            raise ValueError(f"File not found in storage: {storage_path}")

        if expected_size and object_info["size"] != expected_size:
            raise ValueError(
                f"File size mismatch: expected {expected_size}, got {object_info['size']}"
            )

        logger.info(f"Verified upload for asset {asset_id}: {object_info['size']} bytes")

        return {
            "verified": True,
            "size": object_info["size"],
            "etag": object_info["etag"],
            "content_type": object_info["content_type"],
            "storage_path": storage_path,
        }

    def delete_asset(
        self,
        workspace_id: str,
        asset_id: str,
        filename: str,
    ) -> bool:
        """
        Delete an asset from storage.

        Args:
            workspace_id: Workspace UUID
            asset_id: Asset UUID
            filename: Original filename

        Returns:
            bool: True if deletion successful
        """
        storage_path = get_workspace_storage_path(workspace_id, asset_id, filename)
        return self._client.delete_object(storage_path)

    def check_health(self) -> bool:
        """
        Check storage service health.

        Returns:
            bool: True if storage is healthy
        """
        return self._client.health_check()


# Singleton instance
_storage_service: Optional[StorageService] = None


def get_storage_service() -> StorageService:
    """
    Get or create the singleton StorageService instance.

    Returns:
        StorageService: Configured storage service
    """
    global _storage_service
    if _storage_service is None:
        _storage_service = StorageService()
    return _storage_service


def reset_storage_service() -> None:
    """
    Reset the singleton service (for testing purposes).
    """
    global _storage_service
    _storage_service = None
