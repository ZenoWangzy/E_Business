"""
Unit tests for MinIO storage client and storage service.
Tests workspace isolation, presigned URL generation, and error handling.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import timedelta
import uuid

from minio.error import S3Error

from app.core.storage import (
    MinIOClient,
    get_minio_client,
    reset_minio_client,
)
from app.services.storage_service import (
    StorageService,
    secure_filename,
    get_workspace_storage_path,
    calculate_file_checksum,
    get_storage_service,
    reset_storage_service,
)


class TestSecureFilename:
    """Tests for filename sanitization."""

    def test_secure_filename_removes_path_separators(self):
        """Should replace / and \\ with underscores."""
        assert secure_filename("path/to/file.txt") == "path_to_file.txt"
        assert secure_filename("path\\to\\file.txt") == "path_to_file.txt"

    def test_secure_filename_removes_leading_dots(self):
        """Should remove leading dots to prevent hidden files."""
        assert secure_filename("..hidden.txt") == "hidden.txt"
        assert secure_filename("...file") == "file"

    def test_secure_filename_removes_special_chars(self):
        """Should replace non-alphanumeric chars except .-_"""
        assert secure_filename("file@name#test.txt") == "file_name_test.txt"
        assert secure_filename("file name.txt") == "file_name.txt"

    def test_secure_filename_handles_empty(self):
        """Should return default for empty filename."""
        assert secure_filename("") == "unnamed_file"
        assert secure_filename("...") == "unnamed_file"

    def test_secure_filename_preserves_valid_chars(self):
        """Should preserve valid alphanumeric and .-_ chars."""
        assert secure_filename("my-file_123.txt") == "my-file_123.txt"


class TestWorkspaceStoragePath:
    """Tests for workspace-scoped storage path generation."""

    def test_generates_correct_path_structure(self):
        """Should generate workspaces/{workspace_id}/assets/{asset_id}/{filename}."""
        workspace_id = "ws-123"
        asset_id = "asset-456"
        filename = "test.png"

        path = get_workspace_storage_path(workspace_id, asset_id, filename)

        assert path == "workspaces/ws-123/assets/asset-456/test.png"

    def test_sanitizes_filename_in_path(self):
        """Should sanitize unsafe filenames in path."""
        path = get_workspace_storage_path("ws", "asset", "../../../etc/passwd")
        assert "etc_passwd" in path
        assert "../" not in path


class TestFileChecksum:
    """Tests for file checksum calculation."""

    def test_calculates_md5_checksum(self):
        """Should calculate correct MD5 checksum."""
        data = b"Hello, World!"
        checksum = calculate_file_checksum(data)
        assert checksum == "65a8e27d8879283831b664bd8b7f0ad4"

    def test_different_data_different_checksum(self):
        """Different data should produce different checksums."""
        checksum1 = calculate_file_checksum(b"data1")
        checksum2 = calculate_file_checksum(b"data2")
        assert checksum1 != checksum2


class TestMinIOClient:
    """Tests for MinIO client wrapper."""

    @pytest.fixture
    def mock_minio(self):
        """Create a mock Minio client."""
        with patch("app.core.storage.Minio") as mock:
            mock_instance = MagicMock()
            mock.return_value = mock_instance
            mock_instance.bucket_exists.return_value = True
            yield mock_instance

    @pytest.fixture
    def client(self, mock_minio):
        """Create MinIO client with mocked backend."""
        reset_minio_client()
        with patch("app.core.storage.get_settings") as mock_settings:
            mock_settings.return_value = Mock(
                minio_endpoint="localhost:9000",
                minio_root_user="testuser",
                minio_root_password="testpass",
                minio_bucket="test-bucket",
            )
            client = MinIOClient()
            client.client = mock_minio
            return client

    def test_health_check_returns_true_when_healthy(self, client, mock_minio):
        """Should return True when MinIO is accessible."""
        mock_minio.bucket_exists.return_value = True
        assert client.health_check() is True

    def test_health_check_returns_false_on_error(self, client, mock_minio):
        """Should return False when MinIO is not accessible."""
        mock_minio.bucket_exists.side_effect = S3Error(
            "Error", "Error", "Error", "Error", "Error", "Error"
        )
        assert client.health_check() is False

    def test_generate_presigned_upload_url(self, client, mock_minio):
        """Should generate presigned PUT URL."""
        mock_minio.presigned_put_object.return_value = "https://minio/upload-url"

        url = client.generate_presigned_upload_url("test/path.txt")

        assert url == "https://minio/upload-url"
        mock_minio.presigned_put_object.assert_called_once()

    def test_generate_presigned_download_url(self, client, mock_minio):
        """Should generate presigned GET URL."""
        mock_minio.presigned_get_object.return_value = "https://minio/download-url"

        url = client.generate_presigned_download_url("test/path.txt")

        assert url == "https://minio/download-url"
        mock_minio.presigned_get_object.assert_called_once()

    def test_object_exists_returns_true(self, client, mock_minio):
        """Should return True when object exists."""
        mock_minio.stat_object.return_value = Mock()
        assert client.object_exists("test.txt") is True

    def test_object_exists_returns_false_on_error(self, client, mock_minio):
        """Should return False when object doesn't exist."""
        mock_minio.stat_object.side_effect = S3Error(
            "NoSuchKey", "NoSuchKey", "NoSuchKey", "NoSuchKey", "NoSuchKey", "NoSuchKey"
        )
        assert client.object_exists("missing.txt") is False

    def test_get_object_info_returns_metadata(self, client, mock_minio):
        """Should return object metadata dict."""
        from datetime import datetime

        mock_stat = Mock()
        mock_stat.size = 1024
        mock_stat.etag = "abc123"
        mock_stat.content_type = "image/png"
        mock_stat.last_modified = datetime(2024, 1, 1)
        mock_minio.stat_object.return_value = mock_stat

        info = client.get_object_info("test.png")

        assert info["size"] == 1024
        assert info["etag"] == "abc123"
        assert info["content_type"] == "image/png"

    def test_delete_object_success(self, client, mock_minio):
        """Should return True on successful deletion."""
        mock_minio.remove_object.return_value = None
        assert client.delete_object("test.txt") is True

    def test_delete_object_failure(self, client, mock_minio):
        """Should return False on deletion failure."""
        mock_minio.remove_object.side_effect = S3Error(
            "Error", "Error", "Error", "Error", "Error", "Error"
        )
        assert client.delete_object("test.txt") is False


class TestStorageService:
    """Tests for storage service business logic."""

    @pytest.fixture
    def mock_client(self):
        """Create a mock MinIO client."""
        client = Mock(spec=MinIOClient)
        client.generate_presigned_upload_url.return_value = "https://upload-url"
        client.generate_presigned_download_url.return_value = "https://download-url"
        client.health_check.return_value = True
        return client

    @pytest.fixture
    def service(self, mock_client):
        """Create storage service with mocked client."""
        reset_storage_service()
        return StorageService(minio_client=mock_client)

    def test_generate_upload_url_returns_correct_structure(self, service, mock_client):
        """Should return dict with upload_url, storage_path, expires_in."""
        result = service.generate_upload_url(
            workspace_id="ws-123",
            asset_id="asset-456",
            filename="test.png",
        )

        assert "upload_url" in result
        assert "storage_path" in result
        assert "expires_in" in result
        assert result["upload_url"] == "https://upload-url"
        assert "workspaces/ws-123/assets/asset-456" in result["storage_path"]

    def test_generate_upload_url_uses_workspace_isolation(self, service, mock_client):
        """Should generate path with workspace prefix for isolation."""
        result = service.generate_upload_url(
            workspace_id="ws-abc",
            asset_id="asset-xyz",
            filename="file.txt",
        )

        assert result["storage_path"].startswith("workspaces/ws-abc/")

    def test_generate_download_url_returns_correct_structure(self, service, mock_client):
        """Should return dict with download_url and expires_in."""
        result = service.generate_download_url(
            workspace_id="ws-123",
            asset_id="asset-456",
            filename="test.png",
        )

        assert "download_url" in result
        assert "expires_in" in result
        assert result["download_url"] == "https://download-url"

    def test_verify_upload_success(self, service, mock_client):
        """Should return verification details on success."""
        mock_client.get_object_info.return_value = {
            "size": 1024,
            "etag": "abc123",
            "content_type": "image/png",
            "last_modified": None,
        }

        result = service.verify_upload(
            workspace_id="ws-123",
            asset_id="asset-456",
            filename="test.png",
        )

        assert result["verified"] is True
        assert result["size"] == 1024

    def test_verify_upload_fails_when_not_found(self, service, mock_client):
        """Should raise ValueError when file not found."""
        mock_client.get_object_info.return_value = None

        with pytest.raises(ValueError, match="File not found"):
            service.verify_upload(
                workspace_id="ws-123",
                asset_id="asset-456",
                filename="missing.png",
            )

    def test_verify_upload_fails_on_size_mismatch(self, service, mock_client):
        """Should raise ValueError when size doesn't match."""
        mock_client.get_object_info.return_value = {
            "size": 1000,
            "etag": "abc123",
            "content_type": "image/png",
            "last_modified": None,
        }

        with pytest.raises(ValueError, match="size mismatch"):
            service.verify_upload(
                workspace_id="ws-123",
                asset_id="asset-456",
                filename="test.png",
                expected_size=2000,
            )

    def test_delete_asset_delegates_to_client(self, service, mock_client):
        """Should call client delete with correct path."""
        mock_client.delete_object.return_value = True

        result = service.delete_asset(
            workspace_id="ws-123",
            asset_id="asset-456",
            filename="test.png",
        )

        assert result is True
        mock_client.delete_object.assert_called_once()

    def test_check_health_delegates_to_client(self, service, mock_client):
        """Should return client health check result."""
        mock_client.health_check.return_value = True
        assert service.check_health() is True

        mock_client.health_check.return_value = False
        assert service.check_health() is False
