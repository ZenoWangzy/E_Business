"""Unit tests for Image Generation API endpoint validation.

Focus: request validation and cross-entity consistency checks (category + asset).
"""

import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.asset import Asset, StorageStatus
from app.models.image import StyleType
from app.models.product import Product, ProductCategory
from app.schemas.image import ImageGenerationRequest


TEST_WORKSPACE_ID = uuid.uuid4()
TEST_USER_ID = uuid.uuid4()
TEST_PRODUCT_ID = uuid.uuid4()
TEST_ASSET_ID = uuid.uuid4()


@pytest.fixture
def current_user():
    user = MagicMock()
    user.id = TEST_USER_ID
    return user


@pytest.fixture
def test_product():
    return Product(
        id=TEST_PRODUCT_ID,
        workspace_id=TEST_WORKSPACE_ID,
        name="Test Product",
        category=ProductCategory.CLOTHING,
        original_asset_id=TEST_ASSET_ID,
    )


@pytest.fixture
def uploaded_asset():
    return Asset(
        id=TEST_ASSET_ID,
        workspace_id=TEST_WORKSPACE_ID,
        name="test.jpg",
        mime_type="image/jpeg",
        size=1024,
        storage_status=StorageStatus.UPLOADED,
    )


class TestGenerateImagesValidation:
    @pytest.mark.asyncio
    async def test_category_mismatch_returns_400(self, test_product, current_user):
        from app.api.v1.endpoints.image import generate_images

        request = ImageGenerationRequest(
            style_id=StyleType.MODERN,
            category_id=ProductCategory.ELECTRONICS,
            asset_id=TEST_ASSET_ID,
            product_id=TEST_PRODUCT_ID,
        )

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = test_product

        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(return_value=mock_result)

        with pytest.raises(HTTPException) as exc_info:
            await generate_images(
                workspace_id=TEST_WORKSPACE_ID,
                request=request,
                member=MagicMock(),
                current_user=current_user,
                db=mock_db,
            )

        assert exc_info.value.status_code == 400
        assert "Category mismatch" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_asset_not_found_returns_404(self, test_product, current_user):
        from app.api.v1.endpoints.image import generate_images

        request = ImageGenerationRequest(
            style_id=StyleType.MODERN,
            category_id=ProductCategory.CLOTHING,
            asset_id=TEST_ASSET_ID,
            product_id=TEST_PRODUCT_ID,
        )

        product_result = MagicMock()
        product_result.scalar_one_or_none.return_value = test_product

        asset_result = MagicMock()
        asset_result.scalar_one_or_none.return_value = None

        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(side_effect=[product_result, asset_result])

        with pytest.raises(HTTPException) as exc_info:
            await generate_images(
                workspace_id=TEST_WORKSPACE_ID,
                request=request,
                member=MagicMock(),
                current_user=current_user,
                db=mock_db,
            )

        assert exc_info.value.status_code == 404
        assert "Asset not found" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_asset_mismatch_returns_400(self, current_user, uploaded_asset):
        from app.api.v1.endpoints.image import generate_images

        product = Product(
            id=TEST_PRODUCT_ID,
            workspace_id=TEST_WORKSPACE_ID,
            name="Test Product",
            category=ProductCategory.CLOTHING,
            original_asset_id=uuid.uuid4(),
        )

        request = ImageGenerationRequest(
            style_id=StyleType.MODERN,
            category_id=ProductCategory.CLOTHING,
            asset_id=uploaded_asset.id,
            product_id=TEST_PRODUCT_ID,
        )

        product_result = MagicMock()
        product_result.scalar_one_or_none.return_value = product

        asset_result = MagicMock()
        asset_result.scalar_one_or_none.return_value = uploaded_asset

        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(side_effect=[product_result, asset_result])

        with pytest.raises(HTTPException) as exc_info:
            await generate_images(
                workspace_id=TEST_WORKSPACE_ID,
                request=request,
                member=MagicMock(),
                current_user=current_user,
                db=mock_db,
            )

        assert exc_info.value.status_code == 400
        assert "Asset does not match" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_asset_not_uploaded_returns_400(self, test_product, current_user):
        from app.api.v1.endpoints.image import generate_images

        request = ImageGenerationRequest(
            style_id=StyleType.MODERN,
            category_id=ProductCategory.CLOTHING,
            asset_id=TEST_ASSET_ID,
            product_id=TEST_PRODUCT_ID,
        )

        asset = Asset(
            id=TEST_ASSET_ID,
            workspace_id=TEST_WORKSPACE_ID,
            name="test.jpg",
            mime_type="image/jpeg",
            size=1024,
            storage_status=StorageStatus.UPLOADING,
        )

        product_result = MagicMock()
        product_result.scalar_one_or_none.return_value = test_product

        asset_result = MagicMock()
        asset_result.scalar_one_or_none.return_value = asset

        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(side_effect=[product_result, asset_result])

        with pytest.raises(HTTPException) as exc_info:
            await generate_images(
                workspace_id=TEST_WORKSPACE_ID,
                request=request,
                member=MagicMock(),
                current_user=current_user,
                db=mock_db,
            )

        assert exc_info.value.status_code == 400
        assert "Asset is not uploaded" in str(exc_info.value.detail)
