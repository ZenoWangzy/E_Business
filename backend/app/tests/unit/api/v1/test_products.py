"""
Unit tests for Product API endpoints.
Tests product CRUD operations with multi-tenant isolation.
"""
import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product import Product, ProductCategory, ProductStatus
from app.models.asset import Asset
from app.models.user import User, Workspace, WorkspaceMember, UserRole


# Test constants
TEST_WORKSPACE_ID = uuid.uuid4()
TEST_USER_ID = uuid.uuid4()
TEST_ASSET_ID = uuid.uuid4()
TEST_PRODUCT_ID = uuid.uuid4()


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
        name="test.jpg",
        mime_type="image/jpeg",
        size=1024,
    )


@pytest.fixture
def test_product():
    """Create test product"""
    return Product(
        id=TEST_PRODUCT_ID,
        workspace_id=TEST_WORKSPACE_ID,
        name="Test Product",
        category=ProductCategory.CLOTHING,
        original_asset_id=TEST_ASSET_ID,
        status=ProductStatus.DRAFT,
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


class TestCreateProduct:
    """Tests for product creation endpoint"""

    @pytest.mark.asyncio
    async def test_create_product_success(self, test_member, test_asset):
        """Test successful product creation"""
        from app.api.v1.endpoints.products import create_product
        from app.schemas.product import ProductCreate

        # Mock DB session
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = test_asset

        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(return_value=mock_result)
        mock_db.add = MagicMock()
        mock_db.commit = AsyncMock()
        mock_db.refresh = AsyncMock()

        product_data = ProductCreate(
            name="New Product",
            category="clothing",
            original_asset_id=TEST_ASSET_ID,
        )

        # Execute
        result = await create_product(
            workspace_id=TEST_WORKSPACE_ID,
            product_data=product_data,
            member=test_member,
            db=mock_db,
        )

        # Verify
        assert result.name == "New Product"
        assert result.category == ProductCategory.CLOTHING
        assert result.workspace_id == TEST_WORKSPACE_ID
        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_create_product_asset_not_found(self, test_member):
        """Test product creation fails when asset doesn't exist"""
        from app.api.v1.endpoints.products import create_product
        from app.schemas.product import ProductCreate
        from fastapi import HTTPException

        # Mock DB session returning None for asset
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None

        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(return_value=mock_result)

        product_data = ProductCreate(
            name="New Product",
            category="clothing",
            original_asset_id=uuid.uuid4(),  # Non-existent asset
        )

        # Execute and verify
        with pytest.raises(HTTPException) as exc_info:
            await create_product(
                workspace_id=TEST_WORKSPACE_ID,
                product_data=product_data,
                member=test_member,
                db=mock_db,
            )

        assert exc_info.value.status_code == 404
        assert "Asset not found" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_create_product_invalid_category(self, test_member, test_asset):
        """Test product creation fails with invalid category"""
        from app.api.v1.endpoints.products import create_product
        from app.schemas.product import ProductCreate
        from fastapi import HTTPException

        # Mock DB session
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = test_asset

        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(return_value=mock_result)

        product_data = ProductCreate(
            name="New Product",
            category="invalid_category",
            original_asset_id=TEST_ASSET_ID,
        )

        # Execute and verify
        with pytest.raises(HTTPException) as exc_info:
            await create_product(
                workspace_id=TEST_WORKSPACE_ID,
                product_data=product_data,
                member=test_member,
                db=mock_db,
            )

        assert exc_info.value.status_code == 400


class TestGetProduct:
    """Tests for get product endpoint"""

    @pytest.mark.asyncio
    async def test_get_product_success(self, test_member, test_product):
        """Test successful product retrieval"""
        from app.api.v1.endpoints.products import get_product

        # Mock DB session
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = test_product

        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(return_value=mock_result)

        # Execute
        result = await get_product(
            workspace_id=TEST_WORKSPACE_ID,
            product_id=TEST_PRODUCT_ID,
            member=test_member,
            db=mock_db,
        )

        # Verify
        assert result.id == TEST_PRODUCT_ID
        assert result.name == "Test Product"
        assert result.category == ProductCategory.CLOTHING

    @pytest.mark.asyncio
    async def test_get_product_not_found(self, test_member):
        """Test get product returns 404 when not found"""
        from app.api.v1.endpoints.products import get_product
        from fastapi import HTTPException

        # Mock DB session returning None
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None

        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(return_value=mock_result)

        # Execute and verify
        with pytest.raises(HTTPException) as exc_info:
            await get_product(
                workspace_id=TEST_WORKSPACE_ID,
                product_id=uuid.uuid4(),
                member=test_member,
                db=mock_db,
            )

        assert exc_info.value.status_code == 404


class TestUpdateProduct:
    """Tests for update product endpoint"""

    @pytest.mark.asyncio
    async def test_update_product_category_success(self, test_member, test_product):
        """Test successful product category update"""
        from app.api.v1.endpoints.products import update_product
        from app.schemas.product import ProductUpdate

        # Mock DB session
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = test_product

        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(return_value=mock_result)
        mock_db.commit = AsyncMock()
        mock_db.refresh = AsyncMock()

        product_update = ProductUpdate(category="electronics")

        # Execute
        result = await update_product(
            workspace_id=TEST_WORKSPACE_ID,
            product_id=TEST_PRODUCT_ID,
            product_update=product_update,
            member=test_member,
            db=mock_db,
        )

        # Verify
        assert result.category == ProductCategory.ELECTRONICS
        mock_db.commit.assert_called_once()


class TestListProducts:
    """Tests for list products endpoint"""

    @pytest.mark.asyncio
    async def test_list_products_success(self, test_member, test_product):
        """Test successful product listing"""
        from app.api.v1.endpoints.products import list_products

        # Mock DB session
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [test_product]

        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(return_value=mock_result)

        # Execute
        result = await list_products(
            workspace_id=TEST_WORKSPACE_ID,
            member=test_member,
            db=mock_db,
        )

        # Verify
        assert len(result) == 1
        assert result[0].workspace_id == TEST_WORKSPACE_ID

    @pytest.mark.asyncio
    async def test_list_products_multi_tenancy_isolation(self, test_member):
        """Test that products are isolated by workspace"""
        from app.api.v1.endpoints.products import list_products

        # Create products for the workspace
        products_in_workspace = [
            Product(
                id=uuid.uuid4(),
                workspace_id=TEST_WORKSPACE_ID,
                name="Product 1",
                category=ProductCategory.CLOTHING,
                original_asset_id=TEST_ASSET_ID,
            ),
            Product(
                id=uuid.uuid4(),
                workspace_id=TEST_WORKSPACE_ID,
                name="Product 2",
                category=ProductCategory.ELECTRONICS,
                original_asset_id=TEST_ASSET_ID,
            ),
        ]

        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = products_in_workspace

        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.execute = AsyncMock(return_value=mock_result)

        # Execute
        result = await list_products(
            workspace_id=TEST_WORKSPACE_ID,
            member=test_member,
            db=mock_db,
        )

        # Verify all returned products belong to the workspace
        assert len(result) == 2
        for product in result:
            assert product.workspace_id == TEST_WORKSPACE_ID
