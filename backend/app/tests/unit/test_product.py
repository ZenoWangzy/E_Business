"""
Unit tests for Product model and ProductCategory/ProductStatus enums.
Tests AC: Verify Product model has correct fields, relationships, and enum values.
"""
import pytest
from app.models.product import Product, ProductCategory, ProductStatus


class TestProductCategoryEnum:
    """Test suite for ProductCategory enum."""

    def test_product_category_values(self):
        """Test ProductCategory enum has all required values."""
        assert ProductCategory.CLOTHING.value == "clothing"
        assert ProductCategory.ELECTRONICS.value == "electronics"
        assert ProductCategory.BEAUTY.value == "beauty"
        assert ProductCategory.HOME.value == "home"
        assert ProductCategory.FOOD.value == "food"
        assert ProductCategory.SPORTS.value == "sports"
        assert ProductCategory.TOYS.value == "toys"
        assert ProductCategory.BOOKS.value == "books"
        assert ProductCategory.AUTOMOTIVE.value == "automotive"
        assert ProductCategory.HEALTH.value == "health"
        assert ProductCategory.OTHER.value == "other"

    def test_product_category_count(self):
        """Test ProductCategory has exactly 11 categories."""
        assert len(ProductCategory) == 11


class TestProductStatusEnum:
    """Test suite for ProductStatus enum."""

    def test_product_status_values(self):
        """Test ProductStatus enum has all required values."""
        assert ProductStatus.DRAFT.value == "draft"
        assert ProductStatus.READY.value == "ready"
        assert ProductStatus.PROCESSING.value == "processing"
        assert ProductStatus.COMPLETED.value == "completed"
        assert ProductStatus.ARCHIVED.value == "archived"

    def test_product_status_count(self):
        """Test ProductStatus has exactly 5 statuses."""
        assert len(ProductStatus) == 5


class TestProductModel:
    """Test suite for Product model."""

    def test_product_fields_exist(self):
        """Test Product model has all required fields."""
        import uuid
        
        product = Product(
            workspace_id=uuid.uuid4(),
            name="Test Product",
            category=ProductCategory.CLOTHING,
            original_asset_id=uuid.uuid4()
        )
        
        assert product.name == "Test Product"
        assert product.category == ProductCategory.CLOTHING

    def test_product_status_default_configured(self):
        """Test Product status column has DRAFT as default."""
        status_col = Product.__table__.c.status
        # Default is ProductStatus.DRAFT
        assert status_col.default.arg == ProductStatus.DRAFT

    def test_product_id_is_uuid(self):
        """Test Product id field is UUID type."""
        assert Product.__table__.c.id.type.__class__.__name__ == "UUID"

    def test_product_workspace_id_is_indexed(self):
        """Test workspace_id column is indexed for multi-tenant queries."""
        assert Product.__table__.c.workspace_id.index is True

    def test_product_name_max_length(self):
        """Test name column has 255 character limit."""
        name_col = Product.__table__.c.name
        assert name_col.type.length == 255


class TestProductRelationships:
    """Test suite for Product model relationships."""

    def test_product_has_workspace_relationship(self):
        """Test Product model has workspace relationship."""
        assert hasattr(Product, "workspace")

    def test_product_has_original_asset_relationship(self):
        """Test Product model has original_asset relationship."""
        assert hasattr(Product, "original_asset")


class TestProductMultiTenancy:
    """Test suite for Product multi-tenancy isolation."""

    def test_product_requires_workspace_id(self):
        """Test workspace_id is not nullable (multi-tenant isolation)."""
        workspace_col = Product.__table__.c.workspace_id
        assert workspace_col.nullable is False

    def test_product_foreign_key_cascade_delete(self):
        """Test foreign keys have CASCADE delete configured."""
        # Check workspace_id FK
        workspace_fk = None
        for fk in Product.__table__.foreign_keys:
            if 'workspaces.id' in str(fk.target_fullname):
                workspace_fk = fk
                break
        
        assert workspace_fk is not None
        assert workspace_fk.ondelete == "CASCADE"
