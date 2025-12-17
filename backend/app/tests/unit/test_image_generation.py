"""
Unit tests for ImageGenerationJob model and StyleType/JobStatus enums.
Story 2.1: Style Selection & Generation Trigger

Tests:
- Enum values and counts
- Model field existence and types
- Foreign key relationships
- Multi-tenancy isolation
"""
import pytest
import uuid
from app.models.image import ImageGenerationJob, StyleType, JobStatus


class TestStyleTypeEnum:
    """Test suite for StyleType enum."""

    def test_style_type_values(self):
        """Test StyleType enum has all 6 required values."""
        assert StyleType.MODERN.value == "modern"
        assert StyleType.LUXURY.value == "luxury"
        assert StyleType.FRESH.value == "fresh"
        assert StyleType.TECH.value == "tech"
        assert StyleType.WARM.value == "warm"
        assert StyleType.BUSINESS.value == "business"

    def test_style_type_count(self):
        """Test StyleType has exactly 6 styles."""
        assert len(StyleType) == 6


class TestJobStatusEnum:
    """Test suite for JobStatus enum."""

    def test_job_status_values(self):
        """Test JobStatus enum has all required values."""
        assert JobStatus.PENDING.value == "pending"
        assert JobStatus.PROCESSING.value == "processing"
        assert JobStatus.COMPLETED.value == "completed"
        assert JobStatus.FAILED.value == "failed"

    def test_job_status_count(self):
        """Test JobStatus has exactly 4 statuses."""
        assert len(JobStatus) == 4


class TestImageGenerationJobModel:
    """Test suite for ImageGenerationJob model fields."""

    def test_image_generation_job_fields_exist(self):
        """Test ImageGenerationJob model has all required fields via table inspection."""
        # Use table inspection instead of instantiation to avoid ORM mapper checks
        table = ImageGenerationJob.__table__
        
        # Check required columns exist
        assert 'workspace_id' in table.c
        assert 'user_id' in table.c
        assert 'product_id' in table.c
        assert 'task_id' in table.c
        assert 'style_id' in table.c
        assert 'status' in table.c
        assert 'progress' in table.c

    def test_image_generation_job_status_default_configured(self):
        """Test status column has PENDING as default."""
        status_col = ImageGenerationJob.__table__.c.status
        assert status_col.default.arg == JobStatus.PENDING

    def test_image_generation_job_id_is_uuid(self):
        """Test id field is UUID type."""
        assert ImageGenerationJob.__table__.c.id.type.__class__.__name__ == "UUID"

    def test_image_generation_job_task_id_is_unique(self):
        """Test task_id column is unique (for Celery task tracking)."""
        assert ImageGenerationJob.__table__.c.task_id.unique is True

    def test_image_generation_job_task_id_is_indexed(self):
        """Test task_id column is indexed for efficient lookups."""
        assert ImageGenerationJob.__table__.c.task_id.index is True

    def test_image_generation_job_workspace_id_is_indexed(self):
        """Test workspace_id column is indexed for multi-tenant queries."""
        assert ImageGenerationJob.__table__.c.workspace_id.index is True


class TestImageGenerationJobRelationships:
    """Test suite for ImageGenerationJob model relationships."""

    def test_has_workspace_relationship(self):
        """Test model has workspace relationship."""
        assert hasattr(ImageGenerationJob, "workspace")

    def test_has_user_relationship(self):
        """Test model has user relationship."""
        assert hasattr(ImageGenerationJob, "user")

    def test_has_product_relationship(self):
        """Test model has product relationship."""
        assert hasattr(ImageGenerationJob, "product")


class TestImageGenerationJobMultiTenancy:
    """Test suite for ImageGenerationJob multi-tenancy isolation."""

    def test_requires_workspace_id(self):
        """Test workspace_id is not nullable (multi-tenant isolation)."""
        workspace_col = ImageGenerationJob.__table__.c.workspace_id
        assert workspace_col.nullable is False

    def test_requires_user_id(self):
        """Test user_id is not nullable."""
        user_col = ImageGenerationJob.__table__.c.user_id
        assert user_col.nullable is False

    def test_requires_product_id(self):
        """Test product_id is not nullable."""
        product_col = ImageGenerationJob.__table__.c.product_id
        assert product_col.nullable is False

    def test_foreign_key_cascade_delete(self):
        """Test foreign keys have CASCADE delete configured."""
        # Check workspace_id FK
        workspace_fk = None
        for fk in ImageGenerationJob.__table__.foreign_keys:
            if 'workspaces.id' in str(fk.target_fullname):
                workspace_fk = fk
                break
        
        assert workspace_fk is not None
        assert workspace_fk.ondelete == "CASCADE"
