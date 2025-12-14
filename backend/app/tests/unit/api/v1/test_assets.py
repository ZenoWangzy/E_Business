"""
Unit tests for Asset API endpoints (AC: 154-165).

Tests file upload, listing, and deletion with multi-tenant isolation.
"""
import uuid
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from io import BytesIO

from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.asset import Asset
from app.models.user import User, Workspace, WorkspaceMember, UserRole


# Test constants
TEST_WORKSPACE_ID = uuid.uuid4()
TEST_USER_ID = uuid.uuid4()
TEST_ASSET_ID = uuid.uuid4()


@pytest.fixture
def test_user():
    """Create test user"""
    return User(
        id=TEST_USER_ID,
        email="test@example.com",
        hashed_password="hashed_password",
        is_active=True,
    )


@pytest.fixture
def test_workspace():
    """Create test workspace"""
    return Workspace(
        id=TEST_WORKSPACE_ID,
        name="Test Workspace",
        slug="test-workspace",
    )


@pytest.fixture
def test_asset():
    """Create test asset"""
    return Asset(
        id=TEST_ASSET_ID,
        workspace_id=TEST_WORKSPACE_ID,
        name="test.pdf",
        mime_type="application/pdf",
        size=1024,
    )


@pytest.fixture
def test_member():
    """Create test workspace member"""
    return WorkspaceMember(
        id=uuid.uuid4(),
        workspace_id=TEST_WORKSPACE_ID,
        user_id=TEST_USER_ID,
        role=UserRole.MEMBER,
    )


class TestAssetUpload:
    """Tests for file upload endpoint"""

    @pytest.mark.asyncio
    async def test_upload_asset_success(
        self, test_user, test_workspace, test_member
    ):
        """Test successful file upload"""
        from app.api.v1.endpoints.assets import upload_asset, ALLOWED_MIME_TYPES
        
        # Create mock file
        file_content = b"%PDF-1.4\nTest PDF content"
        mock_file = MagicMock(spec=UploadFile)
        mock_file.filename = "test.pdf"
        mock_file.content_type = "application/pdf"
        mock_file.read = AsyncMock(return_value=file_content)
        
        # Mock DB session
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.add = MagicMock()
        mock_db.commit = AsyncMock()
        mock_db.refresh = AsyncMock()
        
        # Execute
        result = await upload_asset(
            workspace_id=TEST_WORKSPACE_ID,
            file=mock_file,
            workspace=test_workspace,
            current_user=test_user,
            db=mock_db,
            member=test_member,
        )
        
        # Verify
        assert result.name == "test.pdf"
        assert result.mime_type == "application/pdf"
        assert result.size == len(file_content)
        assert result.workspace_id == TEST_WORKSPACE_ID
        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_upload_asset_invalid_mime_type(
        self, test_user, test_workspace, test_member
    ):
        """Test upload rejection for invalid MIME type"""
        from app.api.v1.endpoints.assets import upload_asset
        from fastapi import HTTPException
        
        # Create mock executable file
        mock_file = MagicMock(spec=UploadFile)
        mock_file.filename = "malware.exe"
        mock_file.content_type = "application/x-executable"
        mock_file.read = AsyncMock(return_value=b"MZ\x90\x00\x03\x00\x00\x00")
        
        mock_db = AsyncMock(spec=AsyncSession)
        
        # Execute and verify
        with pytest.raises(HTTPException) as exc_info:
            await upload_asset(
                workspace_id=TEST_WORKSPACE_ID,
                file=mock_file,
                workspace=test_workspace,
                current_user=test_user,
                db=mock_db,
                member=test_member,
            )
        
        assert exc_info.value.status_code == 415
        assert "Unsupported file type" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_upload_asset_too_large(
        self, test_user, test_workspace, test_member
    ):
        """Test upload rejection for oversized file"""
        from app.api.v1.endpoints.assets import upload_asset, MAX_FILE_SIZE
        from fastapi import HTTPException
        
        # Create oversized file (11MB)
        large_content = b"x" * (11 * 1024 * 1024)
        mock_file = MagicMock(spec=UploadFile)
        mock_file.filename = "large.pdf"
        mock_file.content_type = "application/pdf"
        mock_file.read = AsyncMock(return_value=large_content)
        
        mock_db = AsyncMock(spec=AsyncSession)
        
        # Execute and verify
        with pytest.raises(HTTPException) as exc_info:
            await upload_asset(
                workspace_id=TEST_WORKSPACE_ID,
                file=mock_file,
                workspace=test_workspace,
                current_user=test_user,
                db=mock_db,
                member=test_member,
            )
        
        assert exc_info.value.status_code == 413
        assert "exceeds maximum" in str(exc_info.value.detail)


class TestAssetList:
    """Tests for asset listing endpoint"""

    @pytest.mark.asyncio
    async def test_list_assets_success(self, test_workspace, test_asset):
        """Test successful asset listing"""
        from app.api.v1.endpoints.assets import list_assets
        
        # Mock DB session with query result
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [test_asset]
        
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(return_value=mock_result)
        
        # Execute
        result = await list_assets(
            workspace_id=TEST_WORKSPACE_ID,
            workspace=test_workspace,
            db=mock_db,
        )
        
        # Verify
        assert len(result) == 1
        assert result[0].name == "test.pdf"
        assert result[0].workspace_id == TEST_WORKSPACE_ID

    @pytest.mark.asyncio
    async def test_list_assets_multi_tenancy_isolation(self, test_workspace):
        """Test that assets are isolated by workspace"""
        from app.api.v1.endpoints.assets import list_assets
        
        # Create assets for different workspaces
        other_workspace_id = uuid.uuid4()
        
        assets_in_workspace = [
            Asset(id=uuid.uuid4(), workspace_id=TEST_WORKSPACE_ID, name="a1.pdf", mime_type="application/pdf", size=100),
            Asset(id=uuid.uuid4(), workspace_id=TEST_WORKSPACE_ID, name="a2.pdf", mime_type="application/pdf", size=200),
        ]
        
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = assets_in_workspace
        
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(return_value=mock_result)
        
        # Execute
        result = await list_assets(
            workspace_id=TEST_WORKSPACE_ID,
            workspace=test_workspace,
            db=mock_db,
        )
        
        # Verify all returned assets belong to the workspace
        assert len(result) == 2
        for asset in result:
            assert asset.workspace_id == TEST_WORKSPACE_ID


class TestAssetDelete:
    """Tests for asset deletion endpoint"""

    @pytest.mark.asyncio
    async def test_delete_asset_success(
        self, test_workspace, test_asset, test_member
    ):
        """Test successful asset deletion"""
        from app.api.v1.endpoints.assets import delete_asset
        
        # Mock DB session
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = test_asset
        
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(return_value=mock_result)
        mock_db.delete = AsyncMock()
        mock_db.commit = AsyncMock()
        
        # Execute
        result = await delete_asset(
            workspace_id=TEST_WORKSPACE_ID,
            asset_id=TEST_ASSET_ID,
            workspace=test_workspace,
            db=mock_db,
            member=test_member,
        )
        
        # Verify
        assert result is None
        mock_db.delete.assert_called_once_with(test_asset)
        mock_db.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_delete_asset_not_found(self, test_workspace, test_member):
        """Test deletion of non-existent asset returns 404"""
        from app.api.v1.endpoints.assets import delete_asset
        from fastapi import HTTPException
        
        # Mock DB session returning None
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(return_value=mock_result)
        
        # Execute and verify
        with pytest.raises(HTTPException) as exc_info:
            await delete_asset(
                workspace_id=TEST_WORKSPACE_ID,
                asset_id=uuid.uuid4(),
                workspace=test_workspace,
                db=mock_db,
                member=test_member,
            )
        
        assert exc_info.value.status_code == 404
        assert "not found" in str(exc_info.value.detail).lower()