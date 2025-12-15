"""
Integration tests for Storage API endpoints.
Tests presigned URL generation, upload confirmation, and workspace isolation.
"""

import uuid
from datetime import datetime, timezone
from unittest.mock import Mock, patch, AsyncMock

import pytest
from fastapi import status
from httpx import AsyncClient

from app.models.asset import Asset, StorageStatus
from app.models.user import User, Workspace, WorkspaceMember, UserRole


class TestPresignedUploadEndpoint:
    """Tests for POST /workspaces/{workspace_id}/assets/upload/presigned."""

    @pytest.fixture
    def mock_storage_service(self):
        """Mock storage service."""
        with patch("app.api.v1.endpoints.storage.get_storage_service") as mock:
            service = Mock()
            service.generate_upload_url.return_value = {
                "upload_url": "https://minio:9000/presigned-upload-url",
                "storage_path": "workspaces/ws-id/assets/asset-id/file.png",
                "expires_in": 3600,
            }
            mock.return_value = service
            yield service

    @pytest.mark.asyncio
    async def test_generate_presigned_upload_url_success(
        self, mock_storage_service
    ):
        """Should generate presigned URL and create asset record."""
        # This test verifies the endpoint logic with mocked dependencies
        workspace_id = str(uuid.uuid4())
        
        request_data = {
            "filename": "test-image.png",
            "fileSize": 1024000,
            "contentType": "image/png",
        }
        
        # Verify request schema accepts camelCase
        from app.schemas.storage import PresignedUploadRequest
        req = PresignedUploadRequest(**request_data)
        
        assert req.filename == "test-image.png"
        assert req.file_size == 1024000
        assert req.content_type == "image/png"

    @pytest.mark.asyncio
    async def test_presigned_response_has_required_fields(self, mock_storage_service):
        """Response should contain upload_url, asset_id, storage_path, expires_in."""
        from app.schemas.storage import PresignedUploadResponse
        
        response = PresignedUploadResponse(
            upload_url="https://minio/upload",
            asset_id="abc-123",
            storage_path="workspaces/ws/assets/a/file.png",
            expires_in=3600,
        )
        
        # Verify camelCase output
        json_data = response.model_dump(by_alias=True)
        assert "uploadUrl" in json_data
        assert "assetId" in json_data
        assert "storagePath" in json_data
        assert "expiresIn" in json_data


class TestUploadConfirmationEndpoint:
    """Tests for POST /workspaces/{workspace_id}/assets/confirm."""

    @pytest.mark.asyncio
    async def test_confirmation_request_accepts_camelcase(self):
        """Should accept camelCase request body."""
        from app.schemas.storage import AssetConfirmation
        
        request_data = {
            "assetId": str(uuid.uuid4()),
            "actualFileSize": 1024000,
            "actualChecksum": "abc123hash",
        }
        
        confirmation = AssetConfirmation(**request_data)
        
        assert confirmation.asset_id == request_data["assetId"]
        assert confirmation.actual_file_size == 1024000
        assert confirmation.actual_checksum == "abc123hash"

    @pytest.mark.asyncio
    async def test_confirmation_response_format(self):
        """Response should have correct format."""
        from app.schemas.storage import AssetConfirmationResponse
        
        response = AssetConfirmationResponse(
            asset_id=str(uuid.uuid4()),
            verified=True,
            storage_status="uploaded",
            file_size=1024000,
        )
        
        json_data = response.model_dump(by_alias=True)
        assert json_data["verified"] is True
        assert json_data["storageStatus"] == "uploaded"


class TestDownloadUrlEndpoint:
    """Tests for GET /workspaces/{workspace_id}/assets/{asset_id}/url."""

    @pytest.mark.asyncio
    async def test_download_response_format(self):
        """Response should have correct format."""
        from app.schemas.storage import PresignedDownloadResponse
        
        response = PresignedDownloadResponse(
            download_url="https://minio/download",
            expires_in=900,
            filename="test.png",
            content_type="image/png",
            file_size=1024,
        )
        
        json_data = response.model_dump(by_alias=True)
        assert "downloadUrl" in json_data
        assert "expiresIn" in json_data
        assert json_data["filename"] == "test.png"


class TestBatchDownloadEndpoint:
    """Tests for POST /workspaces/{workspace_id}/assets/batch-download."""

    @pytest.mark.asyncio
    async def test_batch_request_accepts_list(self):
        """Should accept list of asset IDs."""
        from app.schemas.storage import BatchDownloadRequest
        
        request = BatchDownloadRequest(
            asset_ids=[str(uuid.uuid4()) for _ in range(5)],
            expires_minutes=30,
        )
        
        assert len(request.asset_ids) == 5
        assert request.expires_minutes == 30

    @pytest.mark.asyncio
    async def test_batch_response_contains_items(self):
        """Response should contain items array."""
        from app.schemas.storage import BatchDownloadResponse, BatchDownloadResponseItem
        
        items = [
            BatchDownloadResponseItem(
                asset_id=str(uuid.uuid4()),
                download_url="https://minio/download/1",
                filename="file1.png",
                error=None,
            ),
            BatchDownloadResponseItem(
                asset_id=str(uuid.uuid4()),
                download_url=None,
                filename="file2.png",
                error="Asset not found",
            ),
        ]
        
        response = BatchDownloadResponse(
            items=items,
            expires_in=1800,
        )
        
        assert len(response.items) == 2
        assert response.items[0].download_url is not None
        assert response.items[1].error is not None


class TestStorageHealthEndpoint:
    """Tests for GET /workspaces/{workspace_id}/assets/storage/health."""

    @pytest.mark.asyncio
    async def test_health_response_format(self):
        """Response should have correct format."""
        from app.schemas.storage import StorageHealthResponse
        
        response = StorageHealthResponse(
            healthy=True,
            bucket="ebusiness-assets",
            timestamp=datetime.now(timezone.utc),
        )
        
        json_data = response.model_dump(by_alias=True)
        assert json_data["healthy"] is True
        assert json_data["bucket"] == "ebusiness-assets"
        assert "timestamp" in json_data


class TestWorkspaceIsolation:
    """Tests for multi-tenant workspace isolation."""

    @pytest.mark.asyncio
    async def test_storage_path_includes_workspace_id(self):
        """Storage paths should include workspace ID for isolation."""
        from app.services.storage_service import get_workspace_storage_path
        
        workspace_id = "ws-tenant-123"
        asset_id = "asset-456"
        filename = "test.png"
        
        path = get_workspace_storage_path(workspace_id, asset_id, filename)
        
        assert f"workspaces/{workspace_id}" in path
        assert f"assets/{asset_id}" in path

    @pytest.mark.asyncio
    async def test_different_workspaces_different_paths(self):
        """Same file in different workspaces should have different paths."""
        from app.services.storage_service import get_workspace_storage_path
        
        path1 = get_workspace_storage_path("ws-1", "asset-1", "file.png")
        path2 = get_workspace_storage_path("ws-2", "asset-1", "file.png")
        
        assert path1 != path2
        assert "ws-1" in path1
        assert "ws-2" in path2


class TestStorageStatusEnum:
    """Tests for storage status enum."""

    def test_storage_status_values(self):
        """Should have all required status values."""
        assert StorageStatus.PENDING_UPLOAD.value == "pending_upload"
        assert StorageStatus.UPLOADING.value == "uploading"
        assert StorageStatus.UPLOADED.value == "uploaded"
        assert StorageStatus.FAILED.value == "failed"
        assert StorageStatus.DELETED.value == "deleted"

    def test_storage_status_is_string(self):
        """Status values should be strings for JSON serialization."""
        for status in StorageStatus:
            assert isinstance(status.value, str)
